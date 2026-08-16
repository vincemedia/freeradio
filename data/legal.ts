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

export const TERMS_VERSION = "2026-08-16";

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
    heading: "You are responsible for what you hear",
    body: [
      "Rooms are open. You may encounter views you find wrong, offensive or distressing, from people nobody has vetted. Leaving is one click and is the remedy.",
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
    heading: "Recording",
    body: [
      "A host may record a Co-Channel. When recording is running it is shown in the room's header the entire time, to everybody in it.",
      "If you do not want to be recorded, leave the room. Speaking in a room that shows it is recording is agreement to being recorded.",
      "Recordings are kept for up to thirty days and then stop being listed.",
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
      "Access may be withdrawn at any time, for any reason, including none.",
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
      "Live audio passes through Cloudflare's network to reach the other people in the room. It is not stored unless a host is recording, which the room shows the whole time it is happening.",
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
