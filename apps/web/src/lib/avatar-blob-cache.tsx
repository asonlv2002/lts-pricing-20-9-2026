import { useEffect, useState, type CSSProperties } from "react";
import {
  resolveServiceLtsUrl,
  lamMoiTokenQuaQuanLyPhien,
} from "./api/service-lts";

const blobUrlCache = new Map<string, string>();
const inflightCache = new Map<string, Promise<string | null>>();

export function thuHoiTatCaAvatarBlob(): void {
  for (const blobUrl of blobUrlCache.values()) {
    URL.revokeObjectURL(blobUrl);
  }
  blobUrlCache.clear();
  inflightCache.clear();
}

async function fetchAvatar(
  url: string,
  accessToken: string,
): Promise<string | null> {
  const doFetch = () =>
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    return null;
  }

  if (res.status === 401) {
    try {
      const tokens = await lamMoiTokenQuaQuanLyPhien();
      try {
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      res = await doFetch();
    } catch {
      return null;
    }
  }

  if (!res.ok) return null;
  try {
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function layAvatarBlobUrlTuActor(
  actorAvatarUrl: string | null | undefined,
  accessToken: string | null | undefined,
): Promise<string | null> {
  if (!actorAvatarUrl) return null;
  if (!accessToken) return null;
  const url = resolveServiceLtsUrl(actorAvatarUrl);
  if (!url) return null;

  const cached = blobUrlCache.get(url);
  if (cached) return cached;

  const inflight = inflightCache.get(url);
  if (inflight) return inflight;

  const promise = (async () => {
    const blobUrl = await fetchAvatar(url, accessToken);
    if (blobUrl) blobUrlCache.set(url, blobUrl);
    return blobUrl;
  })().finally(() => {
    inflightCache.delete(url);
  });

  inflightCache.set(url, promise);
  return promise;
}

export function useActorAvatarBlob(
  actorAvatarUrl: string | null | undefined,
  accessToken: string | null | undefined,
): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(
    () => blobUrlCache.get(resolveServiceLtsUrl(actorAvatarUrl) ?? "") ?? null,
  );

  useEffect(() => {
    const url = resolveServiceLtsUrl(actorAvatarUrl);
    if (!url || !accessToken) {
      setBlobUrl(null);
      return;
    }
    if (blobUrlCache.has(url)) {
      setBlobUrl(blobUrlCache.get(url) ?? null);
      return;
    }
    let alive = true;
    layAvatarBlobUrlTuActor(actorAvatarUrl, accessToken)
      .then((next) => {
        if (alive) setBlobUrl(next);
      })
      .catch(() => {
        if (alive) setBlobUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [actorAvatarUrl, accessToken]);

  return blobUrl;
}

interface AvatarBlobImgProps {
  actorAvatarUrl: string | null | undefined;
  accessToken: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function AvatarBlobImg({
  actorAvatarUrl,
  accessToken,
  alt,
  className,
  style,
  title,
}: AvatarBlobImgProps) {
  const blobUrl = useActorAvatarBlob(actorAvatarUrl, accessToken);
  if (!blobUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={style}
      title={title ?? alt}
    />
  );
}
