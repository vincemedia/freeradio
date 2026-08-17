/**
 * What a session signature is for.
 *
 * Shared by the wallet that produces one and the server that checks it, because
 * a signature is only verifiable against the exact protocol and key id it was
 * made under. Two copies of this that drift apart would not fail loudly — they
 * would simply stop anybody from ever connecting, which is what happened when
 * the two sides disagreed about which key was even being used.
 *
 * Security level 0: this is a login, and asking somebody to approve a permission
 * prompt every time they connect to the site they are already looking at is
 * friction that teaches people to click through prompts.
 */
export const SESSION_PROTOCOL: [0, string] = [0, "free radio session"];
