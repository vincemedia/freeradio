/**
 * The terms, and the privacy policy.
 *
 * Kept as data rather than as two pages of markup because they are shown in
 * three places — the pages themselves, the onboarding step, and whatever
 * comes next — and a document that exists twice is a document that will
 * eventually say two different things.
 *
 * Written to be read. A term nobody understands has not been agreed to in any
 * sense that matters, whatever the checkbox says, so these are short
 * sentences about what actually happens rather than defensive paragraphs.
 *
 * This is not legal advice and has not been reviewed by anybody qualified to
 * give it. It says what the software does and disclaims what the operator
 * cannot control; before this carries real users it wants a lawyer's eye.
 */

export const TERMS_VERSION = "2026-08-17";

export interface Clause {
  heading: string;
  body: string[];
}

export const TERMS: Clause[] = [
  {
    heading: "What this is",
    body: [
      "Free Radio is live voice rooms on a frequency. Anyone with a BSV wallet can join a station and speak in it; anyone at all can listen. Nothing here is a broadcast licence, and no frequency is a real radio frequency — they are addresses inside this application.",
    ],
  },
  {
    heading: "You are responsible for what you say",
    body: [
      "Audio is carried between participants and, when a host is recording, written to a file. It is not reviewed, moderated or approved before anybody hears it, and it cannot be.",
      "Everything you say in a Co-Channel is yours. You are solely responsible for it, including anything unlawful, defamatory, infringing or harmful, and for any consequence of it.",
      "The operator of this service is not the author, publisher or editor of what participants say, takes no responsibility for it, and gives no undertaking to review it.",
    ],
  },
  {
    heading: "What you may not do here",
    body: [
      "The general rule is short: do not use Free Radio to do something that would be a crime if you did it anywhere else. Speech being live and unmoderated is not a defence, and nothing below is made lawful by having happened on a frequency.",
      "Specifically, and without limiting that: do not use this service to plan, carry out, solicit or assist any criminal offence. Do not threaten violence against anybody, or incite it. Do not harass, stalk, or target a person or group with abuse, and do not encourage others to.",
      "Do not share, describe or solicit sexual content involving children, in any form, ever. Do not distribute intimate images of anybody without their consent.",
      "Do not use this service for fraud, deception for gain, market manipulation, laundering the proceeds of crime, or the sale of anything whose sale is unlawful — including controlled substances, weapons, and stolen credentials or data.",
      "Do not broadcast material you have no right to broadcast, whether that is somebody else's copyrighted work or somebody else's private information. Do not record or publish a person's private details in order to expose them.",
      "Do not impersonate another person, and do not claim a station is operated by somebody it is not. Do not attempt to break, overload or gain unauthorised access to this service or any part of it, and do not automate participation in rooms.",
      "None of this is enforced before it happens, because none of it can be — audio is live and reaches other people before anybody could review it. It is enforced afterwards, by removing access, and by cooperating with a lawful request from an authority where one is made.",
      "Where the law of your country is stricter than this list, the law of your country is what binds you. Using this service where doing so is itself unlawful is your decision and your responsibility.",
    ],
  },
  {
    heading: "You are responsible for what you hear",
    body: [
      "Rooms are open. You may encounter views you find wrong, offensive or distressing, from people nobody has vetted. Leaving is one click and is the remedy.",
      "Anybody in a room may be recording it by means this service cannot see. Assume they are.",
      "Nothing said in a Co-Channel is advice — financial, legal, medical or otherwise — and none of it has been checked by anybody.",
    ],
  },
  {
    heading: "No warranty, and no liability",
    body: [
      "The service is provided as it is, without warranty of any kind, express or implied, including fitness for a particular purpose and uninterrupted or error-free operation.",
      "To the fullest extent the law allows, the operator is not liable for any loss or damage arising from your use of the service or from anything any participant says or does on it, including indirect, incidental and consequential loss, loss of data, and loss of profit.",
      "Where liability cannot lawfully be excluded, it is limited to the amount you have paid to use the service, which for most people is nothing.",
    ],
  },
  {
    heading: "Recording, and the recording nobody can see",
    body: [
      "A host may record a Co-Channel through this service. When that is running it is shown in the room's header the entire time, to everybody in it, and speaking in a room that shows it is recording is agreement to being recorded.",
      "Anybody else in the room may also be recording, and there is no way for this service or for you to know that they are. A phone on the desk, screen-capture software, a second device — none of it touches this application and none of it can be detected, prevented or announced by it. The indicator in the header is honest about what this service is doing and says nothing about what the other people in the room are doing.",
      "So treat everything you say in a Co-Channel as permanently recorded by somebody, whatever the header says. That is true of every live conversation on the internet, and pretending otherwise would be the more dangerous thing to tell you.",
      "Recordings made through this service are kept for up to thirty days and then stop being listed. Recordings made any other way are outside it entirely, and the operator has no control over them and no responsibility for them.",
    ],
  },
  {
    heading: "Your identity",
    body: [
      "You are identified by your wallet's public key. There is no password and no account to recover: control of the key is control of the identity, and nobody can restore it for you if you lose it.",
      "A username is a label on that key. It is not owned, reserved or unique, and it can be changed.",
    ],
  },
  {
    heading: "Ending things",
    body: [
      "A station closes when the last person leaves, and in any case two hours after it starts. Its frequency then returns to the pool for somebody else.",
      "Access may be withdrawn at any time, for any reason, including none — and will be, without notice, for anything in the list above.",
    ],
  },
];

export const PRIVACY: Clause[] = [
  {
    heading: "What is collected",
    body: [
      "Your wallet's public identity key, which is what you are here. Your chosen username, if you set one. Your avatar, if you upload one.",
      "That is the whole of it. There is no account, no email address, no password, and no analytics or advertising identifier.",
    ],
  },
  {
    heading: "Where it is kept",
    body: [
      "Your key, username and avatar address are held in cookies in your own browser. They are sent back to the server so it knows who is speaking, and they are not sold, shared or combined with anything.",
      "Avatars are stored with Vercel. Voice and recordings are carried and stored by Cloudflare RealtimeKit. Both are processors acting on instruction.",
    ],
  },
  {
    heading: "Audio",
    body: [
      "Live audio passes through Cloudflare's network to reach the other people in the room. It is not stored by this service unless a host is recording, which the room shows the whole time it is happening.",
      "It can be captured by any participant using their own device, which this service cannot detect or prevent. What you say out loud in a room with strangers should be treated as permanent.",
      "Recordings are kept for up to thirty days and then stop being listed.",
    ],
  },
  {
    heading: "Your avatar",
    body: [
      "An uploaded image is re-encoded on the server before it is stored. That is what removes the location, camera and timestamp data most photographs carry — the stored file shares no bytes with the one you sent.",
    ],
  },
  {
    heading: "Getting rid of it",
    body: [
      "Disconnecting forgets your key. Removing your avatar deletes the stored file. Clearing this site's cookies removes the rest.",
      "Anything you said in a recorded room is in that recording, which is a separate thing from your identity and expires on its own schedule.",
    ],
  },
];
