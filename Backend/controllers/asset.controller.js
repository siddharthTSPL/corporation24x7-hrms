const AssetModel = require("../Models/Asset.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");

// ── helpers ──────────────────────────────────────────────────────────────────

const generateAssetId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AST-${ts}-${rand}`;
};

const resolveAssignee = async (assigned_to, assigned_to_model, organisation_id) => {
  if (!assigned_to || !assigned_to_model) return null;

  const modelMap = {
    Admin: AdminModel,
    Manager: Managermodel,
    User: Usermodel,
  };

  const Model = modelMap[assigned_to_model];
  if (!Model) return null;

  const query = { _id: assigned_to };
  if (assigned_to_model !== "Admin") {
    query.organisation_id = organisation_id;
  } else {
    query.organisation_id = organisation_id;
  }

  return Model.findOne(query).select("_id f_name l_name uid work_email designation").lean();
};

// ── SuperAdmin: Create asset ──────────────────────────────────────────────────

const createAssetSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.superAdmin._id;
    const {
      asset_name,
      asset_type,
      serial_number,
      brand,
      model_number,
      purchase_date,
      purchase_price,
      condition,
      notes,
    } = req.body;

    if (!asset_name || !asset_type)
      return next(
        Object.assign(new Error("asset_name and asset_type are required"), { statusCode: 400 })
      );

    const asset = await AssetModel.create({
      organisation_id,
      asset_id: generateAssetId(),
      asset_name,
      asset_type,
      serial_number,
      brand,
      model_number,
      purchase_date,
      purchase_price,
      condition,
      notes,
      created_by: req.superAdmin._id,
      created_by_model: "SuperAdmin",
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Update asset record ──────────────────────────────────────────

const updateAssetSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const allowedFields = [
      "asset_name",
      "asset_type",
      "serial_number",
      "brand",
      "model_number",
      "purchase_date",
      "purchase_price",
      "condition",
      "notes",
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const asset = await AssetModel.findOneAndUpdate(
      { _id: id, organisation_id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Assign asset to Admin ────────────────────────────────────────

const assignAssetToAdminSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;
    const { admin_id } = req.body;

    if (!admin_id)
      return next(Object.assign(new Error("admin_id is required"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status === "assigned")
      return next(
        Object.assign(new Error("Asset is already assigned. Revoke first."), { statusCode: 409 })
      );

    if (asset.status === "retired" || asset.status === "under_maintenance")
      return next(
        Object.assign(
          new Error(`Asset cannot be assigned while in '${asset.status}' status`),
          { statusCode: 400 }
        )
      );

    const admin = await AdminModel.findOne({ _id: admin_id, organisation_id }).select(
      "_id f_name l_name uid working_status"
    );
    if (!admin)
      return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

    if (admin.working_status !== "working")
      return next(
        Object.assign(
          new Error("Cannot assign asset to an admin who is not actively working"),
          { statusCode: 400 }
        )
      );

    asset.assigned_to = admin._id;
    asset.assigned_to_model = "Admin";
    asset.assigned_date = new Date();
    asset.status = "assigned";
    asset.is_returned = false;
    asset.returned_date = null;
    asset.return_condition = null;
    asset.return_notes = null;

    await asset.save();

    return res.status(200).json({
      success: true,
      message: `Asset assigned to ${admin.f_name} ${admin.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Revoke / return asset from Admin ─────────────────────────────

const revokeAssetFromAdminSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;
    const { return_condition, return_notes } = req.body;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status !== "assigned" || !asset.assigned_to)
      return next(Object.assign(new Error("Asset is not currently assigned"), { statusCode: 400 }));

    asset.assignment_history.push({
      assigned_to: asset.assigned_to,
      assigned_to_model: asset.assigned_to_model,
      assigned_date: asset.assigned_date,
      returned_date: new Date(),
      return_condition: return_condition || null,
      return_notes: return_notes || null,
    });

    asset.assigned_to = null;
    asset.assigned_to_model = null;
    asset.returned_date = new Date();
    asset.is_returned = true;
    asset.return_condition = return_condition || null;
    asset.return_notes = return_notes || null;
    asset.status = "available";

    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset revoked and marked as returned",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Get all assets ────────────────────────────────────────────────

const getAllAssetsSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.superAdmin._id;
    const { status, asset_type, assigned_to_model } = req.query;

    const filter = { organisation_id };
    if (status) filter.status = status;
    if (asset_type) filter.asset_type = asset_type;
    if (assigned_to_model) filter.assigned_to_model = assigned_to_model;

    const assets = await AssetModel.find(filter)
      .populate("assigned_to", "f_name l_name uid work_email designation")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Get single asset ──────────────────────────────────────────────

const getAssetByIdSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id })
      .populate("assigned_to", "f_name l_name uid work_email designation")
      .lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

// ── SuperAdmin: Delete asset ──────────────────────────────────────────────────

const deleteAssetSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status === "assigned")
      return next(
        Object.assign(new Error("Cannot delete an assigned asset. Revoke it first."), {
          statusCode: 409,
        })
      );

    await AssetModel.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Create asset ───────────────────────────────────────────────────────

const createAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;
    const {
      asset_name,
      asset_type,
      serial_number,
      brand,
      model_number,
      purchase_date,
      purchase_price,
      condition,
      notes,
    } = req.body;

    if (!asset_name || !asset_type)
      return next(
        Object.assign(new Error("asset_name and asset_type are required"), { statusCode: 400 })
      );

    const asset = await AssetModel.create({
      organisation_id,
      asset_id: generateAssetId(),
      asset_name,
      asset_type,
      serial_number,
      brand,
      model_number,
      purchase_date,
      purchase_price,
      condition,
      notes,
      created_by: req.admin._id,
      created_by_model: "Admin",
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Update asset record ────────────────────────────────────────────────

const updateAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const allowedFields = [
      "asset_name",
      "asset_type",
      "serial_number",
      "brand",
      "model_number",
      "purchase_date",
      "purchase_price",
      "condition",
      "notes",
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const asset = await AssetModel.findOneAndUpdate(
      { _id: id, organisation_id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Assign asset to Employee ──────────────────────────────────────────

const assignAssetToEmployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { employee_id } = req.body;

    if (!employee_id)
      return next(Object.assign(new Error("employee_id is required"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status === "assigned")
      return next(
        Object.assign(new Error("Asset is already assigned. Revoke first."), { statusCode: 409 })
      );

    if (asset.status === "retired" || asset.status === "under_maintenance")
      return next(
        Object.assign(
          new Error(`Asset cannot be assigned while in '${asset.status}' status`),
          { statusCode: 400 }
        )
      );

    const employee = await Usermodel.findOne({ _id: employee_id, organisation_id }).select(
      "_id f_name l_name uid working_status"
    );
    if (!employee)
      return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    if (employee.working_status !== "working")
      return next(
        Object.assign(
          new Error("Cannot assign asset to an employee who is not actively working"),
          { statusCode: 400 }
        )
      );

    asset.assigned_to = employee._id;
    asset.assigned_to_model = "User";
    asset.assigned_date = new Date();
    asset.status = "assigned";
    asset.is_returned = false;
    asset.returned_date = null;
    asset.return_condition = null;
    asset.return_notes = null;

    await asset.save();

    return res.status(200).json({
      success: true,
      message: `Asset assigned to ${employee.f_name} ${employee.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Assign asset to Manager ───────────────────────────────────────────

const assignAssetToManager = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { manager_id } = req.body;

    if (!manager_id)
      return next(Object.assign(new Error("manager_id is required"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status === "assigned")
      return next(
        Object.assign(new Error("Asset is already assigned. Revoke first."), { statusCode: 409 })
      );

    if (asset.status === "retired" || asset.status === "under_maintenance")
      return next(
        Object.assign(
          new Error(`Asset cannot be assigned while in '${asset.status}' status`),
          { statusCode: 400 }
        )
      );

    const manager = await Managermodel.findOne({ _id: manager_id, organisation_id }).select(
      "_id f_name l_name uid working_status"
    );
    if (!manager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    if (manager.working_status !== "working")
      return next(
        Object.assign(
          new Error("Cannot assign asset to a manager who is not actively working"),
          { statusCode: 400 }
        )
      );

    asset.assigned_to = manager._id;
    asset.assigned_to_model = "Manager";
    asset.assigned_date = new Date();
    asset.status = "assigned";
    asset.is_returned = false;
    asset.returned_date = null;
    asset.return_condition = null;
    asset.return_notes = null;

    await asset.save();

    return res.status(200).json({
      success: true,
      message: `Asset assigned to ${manager.f_name} ${manager.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Revoke / return asset ──────────────────────────────────────────────

const revokeAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { return_condition, return_notes } = req.body;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status !== "assigned" || !asset.assigned_to)
      return next(Object.assign(new Error("Asset is not currently assigned"), { statusCode: 400 }));

    asset.assignment_history.push({
      assigned_to: asset.assigned_to,
      assigned_to_model: asset.assigned_to_model,
      assigned_date: asset.assigned_date,
      returned_date: new Date(),
      return_condition: return_condition || null,
      return_notes: return_notes || null,
    });

    asset.assigned_to = null;
    asset.assigned_to_model = null;
    asset.returned_date = new Date();
    asset.is_returned = true;
    asset.return_condition = return_condition || null;
    asset.return_notes = return_notes || null;
    asset.status = "available";

    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset revoked and marked as returned",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Get all assets ─────────────────────────────────────────────────────

const getAllAssetsAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;
    const { status, asset_type, assigned_to_model } = req.query;

    const filter = { organisation_id };
    if (status) filter.status = status;
    if (asset_type) filter.asset_type = asset_type;
    if (assigned_to_model) filter.assigned_to_model = assigned_to_model;

    const assets = await AssetModel.find(filter)
      .populate("assigned_to", "f_name l_name uid work_email designation")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Get single asset ───────────────────────────────────────────────────

const getAssetByIdAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id })
      .populate("assigned_to", "f_name l_name uid work_email designation")
      .lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Delete asset ───────────────────────────────────────────────────────

const deleteAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.status === "assigned")
      return next(
        Object.assign(new Error("Cannot delete an assigned asset. Revoke it first."), {
          statusCode: 409,
        })
      );

    await AssetModel.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ── Shared: Get assets assigned to a specific user (any role) ─────────────────

const getAssetsOfPerson = async (req, res, next) => {
  try {
    const { person_id, person_model } = req.params;

    const validModels = ["Admin", "Manager", "User"];
    if (!validModels.includes(person_model))
      return next(Object.assign(new Error("Invalid person_model"), { statusCode: 400 }));

    let organisation_id;
    if (req.superAdmin) organisation_id = req.superAdmin._id;
    else if (req.admin) organisation_id = req.admin.organisation_id;
    else return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const assets = await AssetModel.find({
      organisation_id,
      assigned_to: person_id,
      assigned_to_model: person_model,
    })
      .select("asset_id asset_name asset_type status assigned_date serial_number brand")
      .lean();

    return res.status(200).json({
      success: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssetSuperAdmin,
  updateAssetSuperAdmin,
  assignAssetToAdminSuperAdmin,
  revokeAssetFromAdminSuperAdmin,
  getAllAssetsSuperAdmin,
  getAssetByIdSuperAdmin,
  deleteAssetSuperAdmin,
  createAssetAdmin,
  updateAssetAdmin,
  assignAssetToEmployee,
  assignAssetToManager,
  revokeAssetAdmin,
  getAllAssetsAdmin,
  getAssetByIdAdmin,
  deleteAssetAdmin,
  getAssetsOfPerson,
};