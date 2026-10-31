// The backend only accepts real campus ids; a draft saved before campuses were
// loaded from the API can still hold an old short name like "rugipo".
const CAMPUS_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function campusIdOrUndefined(id: string | null | undefined): string | undefined {
  return id && CAMPUS_ID_RE.test(id) ? id : undefined;
}

export function onlyCampusIds(ids: readonly string[] | null | undefined): string[] {
  return (ids ?? []).filter((id) => CAMPUS_ID_RE.test(id));
}
