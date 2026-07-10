// Hands a dropped file from the Home page to a Convert page across a route
// change. Files can't travel through history state, so a module singleton
// is the simplest reliable carrier.
let pending = null

export function setPendingFile(file) {
  pending = file
}

export function takePendingFile() {
  const file = pending
  pending = null
  return file
}
