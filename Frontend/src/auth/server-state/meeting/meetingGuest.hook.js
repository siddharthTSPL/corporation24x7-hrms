import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteMeetingGuests, resendGuestPin, revokeMeetingGuest } from "../../api/meeting/meetingGuest.api";
import { MEETING_KEYS } from "./meeting.hook";

// The meeting detail (useMeeting) already carries `guests` for the host / co-hosts, so these
// only need to refresh the ["meetings"] queries.
const useGuestMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: MEETING_KEYS.all }) });
};

export const useInviteGuests = () => useGuestMutation(inviteMeetingGuests); // { id, guests, sendEmail }
export const useResendGuestPin = () => useGuestMutation(resendGuestPin); // { id, guestId }
export const useRevokeGuest = () => useGuestMutation(revokeMeetingGuest); // { id, guestId }
