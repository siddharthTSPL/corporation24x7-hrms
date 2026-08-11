const mongoose = require("mongoose");
const AssetModel = require("../Models/Asset.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");
const { notifyAssetAssigned } = require("../utils/notify.utils");

const PERSON_MODEL_MAP = { Admin: AdminModel, Manager: Managermodel, User: Usermodel };
const PERSON_SELECT =
  "_id f_name l_name uid work_email designation department working_status profile_image";

const generateAssetId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AST-${ts}-${rand}`;
};

const ASSIGNEE_SELECT = "_id f_name l_name uid work_email designation";

const populateAssignments = (query) =>
  query.populate("assignments.assigned_to", ASSIGNEE_SELECT);

const parseQuantity = (value, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
};

const recomputeStatus = (asset) => {
  if (asset.status === "under_maintenance" || asset.status === "retired") return;
  asset.status = asset.available_quantity > 0 ? "available" : "assigned";
};

const doAssign = async ({
  asset,
  organisation_id,
  assignee_id,
  assignee_model,
  Model,
  quantity,
  assignedByName,
  notifyModel,
  next,
}) => {
  if (asset.status === "retired" || asset.status === "under_maintenance") {
    return next(
      Object.assign(new Error(`Asset cannot be assigned while in '${asset.status}' status`), {
        statusCode: 400,
      })
    );
  }

  if (asset.available_quantity < quantity) {
    return next(
      Object.assign(
        new Error(`Only ${asset.available_quantity} unit(s) of this asset are available`),
        { statusCode: 409 }
      )
    );
  }

  const person = await Model.findOne({ _id: assignee_id, organisation_id }).select(
    "_id f_name l_name uid working_status"
  );
  if (!person) return next(Object.assign(new Error(`${assignee_model} not found`), { statusCode: 404 }));

  if (person.working_status !== "working")
    return next(
      Object.assign(new Error(`Cannot assign asset to a ${assignee_model.toLowerCase()} who is not actively working`), {
        statusCode: 400,
      })
    );

  asset.assignments.push({
    assigned_to: person._id,
    assigned_to_model: assignee_model,
    quantity,
    assigned_date: new Date(),
    is_returned: false,
  });

  asset.available_quantity -= quantity;
  recomputeStatus(asset);

  await asset.save();

  notifyAssetAssigned({
    recipientModel: notifyModel,
    recipientId: person._id,
    asset,
    assignedByName,
  });

  return person;
};

const doRevoke = async ({ asset, assignment_id, return_condition, return_notes, next }) => {
  const assignment = asset.assignments.id(assignment_id);

  if (!assignment || assignment.is_returned) {
    return next(
      Object.assign(new Error("Assignment not found or already returned"), { statusCode: 404 })
    );
  }

  assignment.is_returned = true;
  assignment.returned_date = new Date();
  assignment.return_condition = return_condition || null;
  assignment.return_notes = return_notes || null;

  asset.available_quantity += assignment.quantity;
  recomputeStatus(asset);

  await asset.save();
  return assignment;
};

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
      quantity,
    } = req.body;

    if (!asset_name || !asset_type)
      return next(
        Object.assign(new Error("asset_name and asset_type are required"), { statusCode: 400 })
      );

    const qty = parseQuantity(quantity, 1);
    if (qty === null)
      return next(Object.assign(new Error("quantity must be a whole number of at least 1"), { statusCode: 400 }));

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
      total_quantity: qty,
      available_quantity: qty,
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

const updateAssetSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

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
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) asset[field] = req.body[field];
    });

    if (req.body.total_quantity !== undefined) {
      const newTotal = parseQuantity(req.body.total_quantity, null);
      if (newTotal === null)
        return next(Object.assign(new Error("total_quantity must be a whole number of at least 1"), { statusCode: 400 }));

      const assignedCount = asset.total_quantity - asset.available_quantity;
      if (newTotal < assignedCount)
        return next(
          Object.assign(
            new Error(`Cannot set quantity below ${assignedCount}, the number of units currently assigned`),
            { statusCode: 400 }
          )
        );

      asset.available_quantity += newTotal - asset.total_quantity;
      asset.total_quantity = newTotal;
    }

    recomputeStatus(asset);
    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const assignAssetToAdminSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;
    const { admin_id, quantity } = req.body;

    if (!admin_id)
      return next(Object.assign(new Error("admin_id is required"), { statusCode: 400 }));

    const qty = parseQuantity(quantity, 1);
    if (qty === null)
      return next(Object.assign(new Error("quantity must be a whole number of at least 1"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    const admin = await doAssign({
      asset,
      organisation_id,
      assignee_id: admin_id,
      assignee_model: "Admin",
      Model: AdminModel,
      quantity: qty,
      assignedByName: `${req.superAdmin.f_name || ""} ${req.superAdmin.l_name || ""}`.trim() || "SuperAdmin",
      notifyModel: "Admin",
      next,
    });
    if (!admin) return;

    return res.status(200).json({
      success: true,
      message: `${qty} unit(s) of asset assigned to ${admin.f_name} ${admin.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const revokeAssetFromAdminSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;
    const { assignment_id, return_condition, return_notes } = req.body;

    if (!assignment_id)
      return next(Object.assign(new Error("assignment_id is required"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    const assignment = await doRevoke({ asset, assignment_id, return_condition, return_notes, next });
    if (!assignment) return;

    return res.status(200).json({
      success: true,
      message: "Asset unit revoked and marked as returned",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAssetsSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.superAdmin._id;
    const { status, asset_type } = req.query;

    const filter = { organisation_id };
    if (status) filter.status = status;
    if (asset_type) filter.asset_type = asset_type;

    const assets = await populateAssignments(
      AssetModel.find(filter).sort({ createdAt: -1 })
    ).lean();

    return res.status(200).json({
      success: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

const getAssetByIdSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const asset = await populateAssignments(AssetModel.findOne({ _id: id, organisation_id })).lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

const deleteAssetSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.superAdmin._id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.available_quantity !== asset.total_quantity)
      return next(
        Object.assign(new Error("Cannot delete an asset with units still assigned. Revoke them first."), {
          statusCode: 409,
        })
      );

    await AssetModel.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

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
      quantity,
    } = req.body;

    if (!asset_name || !asset_type)
      return next(
        Object.assign(new Error("asset_name and asset_type are required"), { statusCode: 400 })
      );

    const qty = parseQuantity(quantity, 1);
    if (qty === null)
      return next(Object.assign(new Error("quantity must be a whole number of at least 1"), { statusCode: 400 }));

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
      total_quantity: qty,
      available_quantity: qty,
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

const updateAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

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
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) asset[field] = req.body[field];
    });

    if (req.body.total_quantity !== undefined) {
      const newTotal = parseQuantity(req.body.total_quantity, null);
      if (newTotal === null)
        return next(Object.assign(new Error("total_quantity must be a whole number of at least 1"), { statusCode: 400 }));

      const assignedCount = asset.total_quantity - asset.available_quantity;
      if (newTotal < assignedCount)
        return next(
          Object.assign(
            new Error(`Cannot set quantity below ${assignedCount}, the number of units currently assigned`),
            { statusCode: 400 }
          )
        );

      asset.available_quantity += newTotal - asset.total_quantity;
      asset.total_quantity = newTotal;
    }

    recomputeStatus(asset);
    await asset.save();

    return res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const assignAssetToEmployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { employee_id, quantity } = req.body;

    if (!employee_id)
      return next(Object.assign(new Error("employee_id is required"), { statusCode: 400 }));

    const qty = parseQuantity(quantity, 1);
    if (qty === null)
      return next(Object.assign(new Error("quantity must be a whole number of at least 1"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    const employee = await doAssign({
      asset,
      organisation_id,
      assignee_id: employee_id,
      assignee_model: "User",
      Model: Usermodel,
      quantity: qty,
      assignedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
      notifyModel: "User",
      next,
    });
    if (!employee) return;

    return res.status(200).json({
      success: true,
      message: `${qty} unit(s) of asset assigned to ${employee.f_name} ${employee.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const assignAssetToManager = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { manager_id, quantity } = req.body;

    if (!manager_id)
      return next(Object.assign(new Error("manager_id is required"), { statusCode: 400 }));

    const qty = parseQuantity(quantity, 1);
    if (qty === null)
      return next(Object.assign(new Error("quantity must be a whole number of at least 1"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    const manager = await doAssign({
      asset,
      organisation_id,
      assignee_id: manager_id,
      assignee_model: "Manager",
      Model: Managermodel,
      quantity: qty,
      assignedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
      notifyModel: "Manager",
      next,
    });
    if (!manager) return;

    return res.status(200).json({
      success: true,
      message: `${qty} unit(s) of asset assigned to ${manager.f_name} ${manager.l_name} successfully`,
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const revokeAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { assignment_id, return_condition, return_notes } = req.body;

    if (!assignment_id)
      return next(Object.assign(new Error("assignment_id is required"), { statusCode: 400 }));

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset) return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    const assignment = await doRevoke({ asset, assignment_id, return_condition, return_notes, next });
    if (!assignment) return;

    return res.status(200).json({
      success: true,
      message: "Asset unit revoked and marked as returned",
      asset,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAssetsAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;
    const { status, asset_type } = req.query;

    const filter = { organisation_id };
    if (status) filter.status = status;
    if (asset_type) filter.asset_type = asset_type;

    const assets = await populateAssignments(
      AssetModel.find(filter).sort({ createdAt: -1 })
    ).lean();

    return res.status(200).json({
      success: true,
      total: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

const getAssetByIdAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const asset = await populateAssignments(AssetModel.findOne({ _id: id, organisation_id })).lean();

    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, asset });
  } catch (error) {
    next(error);
  }
};

const deleteAssetAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const asset = await AssetModel.findOne({ _id: id, organisation_id });
    if (!asset)
      return next(Object.assign(new Error("Asset not found"), { statusCode: 404 }));

    if (asset.available_quantity !== asset.total_quantity)
      return next(
        Object.assign(new Error("Cannot delete an asset with units still assigned. Revoke them first."), {
          statusCode: 409,
        })
      );

    await AssetModel.deleteOne({ _id: id });

    return res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

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
      assignments: {
        $elemMatch: { assigned_to: person_id, assigned_to_model: person_model, is_returned: false },
      },
    })
      .select("asset_id asset_name asset_type status serial_number brand assignments")
      .lean();

    const result = assets.map((a) => {
      const myAssignments = (a.assignments || []).filter(
        (x) =>
          String(x.assigned_to) === String(person_id) &&
          x.assigned_to_model === person_model &&
          !x.is_returned
      );
      const { assignments, ...rest } = a;
      return {
        ...rest,
        quantity: myAssignments.reduce((sum, x) => sum + x.quantity, 0),
        assigned_date: myAssignments[0]?.assigned_date || null,
      };
    });

    return res.status(200).json({
      success: true,
      total: result.length,
      assets: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignableAdminsSuperAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.superAdmin._id;

    const admins = await AdminModel.find({ organisation_id, working_status: "working" })
      .select("_id f_name l_name uid work_email designation working_status")
      .lean();

    return res.status(200).json({ success: true, total: admins.length, admins });
  } catch (error) {
    next(error);
  }
};

const getAssignableManagersAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const managers = await Managermodel.find({ organisation_id, working_status: "working" })
      .select("_id f_name l_name uid work_email designation working_status")
      .lean();

    return res.status(200).json({ success: true, total: managers.length, managers });
  } catch (error) {
    next(error);
  }
};

const getAssignableEmployeesAdmin = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const employees = await Usermodel.find({ organisation_id, working_status: "working" })
      .select("_id f_name l_name uid work_email designation working_status")
      .lean();

    return res.status(200).json({ success: true, total: employees.length, employees });
  } catch (error) {
    next(error);
  }
};

// List of employees/admins/managers who currently hold at least one assigned asset unit,
// with a summary of how many assets they have. Available to both SuperAdmin and Admin.
const getEmployeesWithAssets = async (req, res, next) => {
  try {
    let organisation_id;
    if (req.superAdmin) organisation_id = req.superAdmin._id;
    else if (req.admin) organisation_id = req.admin.organisation_id;
    else return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const grouped = await AssetModel.aggregate([
      { $match: { organisation_id: new mongoose.Types.ObjectId(organisation_id) } },
      { $unwind: "$assignments" },
      { $match: { "assignments.is_returned": false } },
      {
        $group: {
          _id: {
            assigned_to: "$assignments.assigned_to",
            assigned_to_model: "$assignments.assigned_to_model",
          },
          total_assets_assigned: { $sum: "$assignments.quantity" },
          distinct_assignments: { $sum: 1 },
          last_assigned_date: { $max: "$assignments.assigned_date" },
        },
      },
    ]);

    const idsByModel = { Admin: [], Manager: [], User: [] };
    grouped.forEach((g) => idsByModel[g._id.assigned_to_model]?.push(g._id.assigned_to));

    const peopleByKey = {};
    await Promise.all(
      Object.keys(idsByModel).map(async (modelName) => {
        if (!idsByModel[modelName].length) return;
        const people = await PERSON_MODEL_MAP[modelName]
          .find({ _id: { $in: idsByModel[modelName] } })
          .select(PERSON_SELECT)
          .lean();
        people.forEach((p) => (peopleByKey[`${modelName}_${p._id}`] = p));
      })
    );

    const employees = grouped
      .map((g) => {
        const key = `${g._id.assigned_to_model}_${g._id.assigned_to}`;
        const person = peopleByKey[key];
        if (!person) return null;
        return {
          person_id: person._id,
          person_model: g._id.assigned_to_model,
          f_name: person.f_name,
          l_name: person.l_name,
          uid: person.uid,
          work_email: person.work_email,
          designation: person.designation,
          department: person.department,
          working_status: person.working_status,
          total_assets_assigned: g.total_assets_assigned,
          distinct_assignments: g.distinct_assignments,
          last_assigned_date: g.last_assigned_date,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.last_assigned_date) - new Date(a.last_assigned_date));

    return res.status(200).json({ success: true, total: employees.length, employees });
  } catch (error) {
    next(error);
  }
};

// Full asset assignment history (active + returned) for a single person, with assign/revoke dates.
// Available to both SuperAdmin and Admin.
const getEmployeeAssetHistory = async (req, res, next) => {
  try {
    const { person_id, person_model } = req.params;

    if (!PERSON_MODEL_MAP[person_model])
      return next(Object.assign(new Error("Invalid person_model"), { statusCode: 400 }));

    let organisation_id;
    if (req.superAdmin) organisation_id = req.superAdmin._id;
    else if (req.admin) organisation_id = req.admin.organisation_id;
    else return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const person = await PERSON_MODEL_MAP[person_model]
      .findOne({ _id: person_id, organisation_id })
      .select(PERSON_SELECT)
      .lean();
    if (!person) return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    const assets = await AssetModel.find({
      organisation_id,
      assignments: {
        $elemMatch: { assigned_to: person_id, assigned_to_model: person_model },
      },
    })
      .select("asset_id asset_name asset_type serial_number brand model_number status assignments")
      .lean();

    const history = [];
    assets.forEach((a) => {
      (a.assignments || [])
        .filter(
          (x) =>
            String(x.assigned_to) === String(person_id) && x.assigned_to_model === person_model
        )
        .forEach((x) => {
          history.push({
            assignment_id: x._id,
            asset_id: a._id,
            asset_code: a.asset_id,
            asset_name: a.asset_name,
            asset_type: a.asset_type,
            serial_number: a.serial_number,
            brand: a.brand,
            model_number: a.model_number,
            asset_status: a.status,
            quantity: x.quantity,
            assigned_date: x.assigned_date,
            returned_date: x.returned_date,
            is_returned: x.is_returned,
            return_condition: x.return_condition,
            return_notes: x.return_notes,
          });
        });
    });

    history.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

    const currently_assigned = history.filter((h) => !h.is_returned);
    const returned_history = history.filter((h) => h.is_returned);

    return res.status(200).json({
      success: true,
      employee: { ...person, person_model },
      total_records: history.length,
      currently_assigned_count: currently_assigned.length,
      returned_count: returned_history.length,
      currently_assigned,
      returned_history,
      history,
    });
  } catch (error) {
    next(error);
  }
};

// Self-service: lets a logged-in Admin, Manager, or User fetch the list of
// assets currently assigned to them (used by their own Dashboard/Settings
// "My Assets" widget). Not for looking up someone else — that's getAssetsOfPerson.
const getMyAssets = async (req, res, next) => {
  try {
    let person, person_model;
    if (req.employee) {
      person = req.employee;
      person_model = "User";
    } else if (req.manager) {
      person = req.manager;
      person_model = "Manager";
    } else if (req.admin) {
      person = req.admin;
      person_model = "Admin";
    } else {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const organisation_id = person.organisation_id;

    const assets = await AssetModel.find({
      organisation_id,
      assignments: {
        $elemMatch: { assigned_to: person._id, assigned_to_model: person_model, is_returned: false },
      },
    })
      .select("asset_id asset_name asset_type status serial_number brand model_number assignments")
      .lean();

    const myAssets = [];
    assets.forEach((a) => {
      (a.assignments || [])
        .filter(
          (x) =>
            String(x.assigned_to) === String(person._id) &&
            x.assigned_to_model === person_model &&
            !x.is_returned
        )
        .forEach((x) => {
          myAssets.push({
            assignment_id: x._id,
            asset_id: a._id,
            asset_code: a.asset_id,
            asset_name: a.asset_name,
            asset_type: a.asset_type,
            serial_number: a.serial_number,
            brand: a.brand,
            model_number: a.model_number,
            asset_status: a.status,
            quantity: x.quantity,
            assigned_date: x.assigned_date,
          });
        });
    });

    myAssets.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

    return res.status(200).json({
      success: true,
      total: myAssets.length,
      total_units: myAssets.reduce((sum, x) => sum + x.quantity, 0),
      assets: myAssets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAssets,
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
  getAssignableAdminsSuperAdmin,
  getAssignableManagersAdmin,
  getAssignableEmployeesAdmin,
  getEmployeesWithAssets,
  getEmployeeAssetHistory,
};