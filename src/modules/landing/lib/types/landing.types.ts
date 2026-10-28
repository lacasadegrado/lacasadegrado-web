export type PublishedEvent = {
  id: string;
  name: string;
  institution: string;
  /** YYYY-MM-DD, or null when the event has no date yet. */
  eventDate: string | null;
  photoCount: number;
};
