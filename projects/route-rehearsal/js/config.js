// Public browser key. Restricted in Google Cloud to chasezhang.me and to the
// Maps JavaScript, Routes and Places (New) APIs, with daily quota caps.
export const GMAPS_KEY = 'AIzaSyDs6S7Q_75OiUWBrmJe9Ih_ycwV8ZXkwHk';

export const DEFAULT_VIEW = { center: { lat: 37.7749, lng: -122.4194 }, zoom: 12 };

export const LOOK_AHEAD_M = 25;   // camera aims at the route this far ahead
export const PANO_RADIUS_M = 25;  // search radius when (re)finding a panorama for a point
export const OFF_ROUTE_M = 15;    // panoramas farther than this from the route line are rejected
export const REANCHOR_M = 30;     // if road-following ends up farther than this from the target, search again
export const MAX_HOPS = 6;        // panorama-to-panorama hops per step
export const TURN_ZONE_M = 80;    // "slow near turns" kicks in within this distance
export const JUMP_RADIUS_M = 200; // map clicks closer than this to the route offer "Jump here"

export const SPACING_OPTIONS = [10, 15, 25, 40];
export const SPEED_OPTIONS = [0.5, 1, 2, 3, 5];
