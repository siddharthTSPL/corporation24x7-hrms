// Built-in daily quiz bank (admins can add their own questions on top).
// [id, category, question, [options], correctIndex, explanation]
const RAW = [
  ["s1", "Security", "Which of these is the strongest password habit?", ["Reuse one strong password everywhere", "Use a unique passphrase per account with a password manager", "Change one letter each month", "Write it on a sticky note"], 1, "Unique passphrases + a manager means one leak never exposes your other accounts."],
  ["s2", "Security", "You get an email asking you to urgently 'verify' your login via a link. What do you do?", ["Click quickly before it expires", "Reply with your password", "Report it as phishing and don't click", "Forward it to the whole team"], 2, "Urgency is a classic phishing trick. Report it; never click."],
  ["s3", "Security", "What does '2FA' add to your login?", ["A faster login", "A second proof of identity", "A longer password", "Auto-fill"], 1, "Two-factor authentication requires something you know plus something you have."],
  ["s4", "Security", "Leaving your desk for a coffee. Best practice?", ["Leave the screen on", "Lock your screen", "Ask a friend to watch it", "Turn the monitor off"], 1, "Win+L / Ctrl+Cmd+Q takes one second and blocks shoulder-surfers."],
  ["w1", "Wellbeing", "How often is it recommended to look away from your screen?", ["Every 20 minutes for ~20 seconds", "Once an hour for 5 seconds", "Only at lunch", "Never, it's fine"], 0, "The 20-20-20 rule: every 20 min look at something 20 feet away for 20 seconds."],
  ["w2", "Wellbeing", "Which helps most with sustained focus?", ["Constant multitasking", "Short, planned breaks", "Skipping lunch", "More coffee"], 1, "Short breaks restore attention; multitasking splits it."],
  ["w3", "Wellbeing", "A teammate seems overwhelmed. A good first step is to…", ["Ignore it", "Check in privately and offer help", "Post about it in the group chat", "Take over their work silently"], 1, "A private, kind check-in respects them and opens the door to support."],
  ["w4", "Wellbeing", "Approximately how many hours of sleep do most adults need?", ["4–5", "6", "7–9", "10–12"], 2, "Most adults function best on 7–9 hours."],
  ["p1", "Productivity", "The Eisenhower Matrix sorts tasks by…", ["Cost and time", "Urgency and importance", "Size and colour", "Owner and date"], 1, "Urgent/important quadrants help you decide what to do, schedule, delegate or drop."],
  ["p2", "Productivity", "A good meeting always has…", ["Free snacks", "A clear purpose and an agenda", "At least 10 people", "A 2-hour slot"], 1, "No agenda, no meeting. Purpose keeps time and attention well spent."],
  ["p3", "Productivity", "The 'Pomodoro' technique uses…", ["25-minute focus blocks with short breaks", "8-hour sprints", "Random timers", "Only evening work"], 0, "Typically 25 min on, 5 min off, with a longer break every 4 rounds."],
  ["p4", "Productivity", "What does 'SMART' stand for in SMART goals?", ["Simple, Modern, Agile, Ready, Timely", "Specific, Measurable, Achievable, Relevant, Time-bound", "Strong, Meaningful, Active, Real, True", "Short, Mini, Accurate, Rapid, Tidy"], 1, "SMART goals are clear enough to know when you've hit them."],
  ["p5", "Productivity", "Which email habit saves the most collective time?", ["Reply-all to everything", "A clear subject line and a single ask", "Writing very long emails", "Using only emojis"], 1, "Clear subject + one ask means faster, better replies."],
  ["h1", "HR", "A 'probation period' is mainly…", ["A paid holiday", "An initial period to assess fit for the role", "A type of bonus", "A training course"], 1, "It lets both sides check that the role and the person are a good match."],
  ["h2", "HR", "CTC stands for…", ["Cost to Company", "Cash Transfer Code", "Company Tax Credit", "Certified Training Course"], 0, "CTC is the total annual cost an employer bears for an employee."],
  ["h3", "HR", "What is 'in-hand salary'?", ["CTC before any deductions", "The amount credited after deductions", "Only the bonus", "Reimbursements only"], 1, "It's what lands in your bank account after PF, tax and other deductions."],
  ["h4", "HR", "A '360-degree review' collects feedback from…", ["Only your manager", "Peers, reports, managers and self", "Only customers", "Only HR"], 1, "360 means all around you — a fuller picture than one viewpoint."],
  ["h5", "HR", "Which is a good example of constructive feedback?", ["'You're always late.'", "'In last week's two stand-ups you joined 10 min late; can we find a time that works?'", "'Try harder.'", "'Everyone's annoyed with you.'"], 1, "Specific, observable and collaborative beats vague or personal."],
  ["c1", "Culture", "Psychological safety means…", ["Nobody ever disagrees", "People feel safe to speak up and make mistakes", "Strict rules for everything", "Working from home"], 1, "Teams with psychological safety learn faster and share problems earlier."],
  ["c2", "Culture", "Best way to give recognition?", ["Rarely but loudly", "Specific, timely and sincere", "Only at appraisal time", "Only to top performers"], 1, "Say exactly what they did and why it mattered, soon after it happened."],
  ["c3", "Culture", "Inclusive meetings…", ["Let the loudest voice lead", "Make sure quieter people can contribute", "Only invite seniors", "Avoid agendas"], 1, "Actively inviting input improves decisions."],
  ["t1", "Tech", "What does 'cloud storage' mean?", ["Files stored on internet-connected servers", "Weather-based storage", "A USB drive", "An encrypted notebook"], 0, "Your files live on remote servers you reach over the internet."],
  ["t2", "Tech", "Which shortcut copies the selected text on Windows?", ["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + Z"], 0, "Ctrl + C copies, Ctrl + V pastes, Ctrl + X cuts, Ctrl + Z undoes."],
  ["t3", "Tech", "A 'VPN' is mainly used to…", ["Speed up videos", "Create a secure, encrypted connection", "Block all ads", "Clean viruses"], 1, "It encrypts traffic between your device and a private network."],
  ["t4", "Tech", "What should you do about software update prompts?", ["Postpone indefinitely", "Install them promptly", "Disable them", "Only update yearly"], 1, "Updates patch security holes that attackers actively exploit."],
  ["g1", "General", "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], 1, "Iron oxide on its surface gives Mars its reddish colour."],
  ["g2", "General", "How many minutes are in a full working day of 8 hours?", ["360", "420", "480", "540"], 2, "8 × 60 = 480 minutes."],
  ["g3", "General", "In which year did India gain independence?", ["1945", "1947", "1950", "1952"], 1, "India became independent on 15 August 1947."],
  ["g4", "General", "What is the largest ocean on Earth?", ["Atlantic", "Indian", "Arctic", "Pacific"], 3, "The Pacific covers roughly a third of the planet's surface."],
  ["g5", "General", "Which gas do plants absorb from the air for photosynthesis?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], 2, "Plants turn CO₂ and water into sugars using sunlight."],
  ["g6", "General", "What is the national animal of India?", ["Lion", "Tiger", "Elephant", "Peacock"], 1, "The Bengal tiger is India's national animal; the peacock is the national bird."],
];

const BANK = RAW.map(([id, category, question, options, answer, explanation]) => ({ id, category, question, options, answer, explanation }));

module.exports = { BANK };
