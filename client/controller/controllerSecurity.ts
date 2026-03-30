export interface LocationLike {
  protocol: string;
  host: string;
  search: string;
}

export function readControllerAccessKey(search: string): string | null {
  return new URLSearchParams(search).get('k');
}

export function buildControllerId(randomSource: () => number = Math.random): string {
  const randomPart = randomSource().toString(36).replace(/^0\./, '').padEnd(8, '0').slice(0, 8);
  return `player-${randomPart}`;
}

export function buildControllerWebSocketUrl(location: LocationLike, accessKey: string): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const encodedAccessKey = encodeURIComponent(accessKey);
  return `${protocol}//${location.host}/ws/controller?k=${encodedAccessKey}`;
}

