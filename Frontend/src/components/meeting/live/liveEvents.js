// ONE place that knows the socket event names used by the live-meeting tools.
// The names come from the Part 2 plan (meetingLive.service.js). The payload field names below are
// written to be forgiving (see normalize* helpers in liveStore.js). If something on the server is
// named differently, change it HERE and nothing else needs to be touched.
export const EV = {
  speaking: "meeting:speaking",
  spotlight: "meeting:spotlight",
  caption: "meeting:caption",
  recording: "meeting:recording",
  flags: "meeting:flags",

  // Q&A: the list itself comes from REST (GET meetings/:id/questions); these only ask / change / tell us to refetch.
  qaAsk: "meeting:qa:ask",
  qaUpvote: "meeting:qa:upvote",
  qaAnswer: "meeting:qa:answer",
  qaPin: "meeting:qa:pin",
  qaDelete: "meeting:qa:delete",
  qaChanged: ["meeting:qa", "meeting:question", "meeting:qa:ask", "meeting:qa:upvote", "meeting:qa:answer", "meeting:qa:pin", "meeting:qa:delete"],

  boardStroke: "meeting:board:stroke",
  boardUndo: "meeting:board:undo",
  boardClear: "meeting:board:clear",
  boardView: "meeting:board:view",

  timerStart: "meeting:timer:start",
  timerPause: "meeting:timer:pause",
  timerResume: "meeting:timer:resume",
  timerReset: "meeting:timer:reset",
  agendaSet: "meeting:agenda:set",
  agendaNext: "meeting:agenda:next",
  agendaToggle: "meeting:agenda:toggle",

  pulseStart: "meeting:pulse:start",
  pulseVote: "meeting:pulse:vote",
  pulseClose: "meeting:pulse:close",
  wheelSpin: "meeting:wheel:spin",
  kudosGive: "meeting:kudos:give",
  kudosReceived: "meeting:kudos-received",
  decisionAdd: "meeting:decision:add",
  decisionRemove: "meeting:decision:remove",
  decisionChanged: ["meeting:decision", "meeting:decision:add", "meeting:decision:remove", "meeting:decision:updated"],
};

// every broadcast we listen to (handlers are bound in useLiveBridge)
export const LISTEN = [
  EV.speaking, EV.spotlight, EV.caption, EV.recording, EV.flags,
  EV.boardStroke, EV.boardUndo, EV.boardClear, EV.boardView,
  EV.timerStart, EV.timerPause, EV.timerResume, EV.timerReset, EV.agendaSet, EV.agendaNext, EV.agendaToggle,
  EV.pulseStart, EV.pulseVote, EV.pulseClose, EV.wheelSpin, EV.kudosReceived,
  ...EV.decisionChanged, ...EV.qaChanged,
];
