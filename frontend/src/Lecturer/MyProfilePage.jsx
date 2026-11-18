// Lecturer: 我的资料。Full-time 显示教学时数；Part-time 显示可编辑的每周可用时间。
import { useEffect, useState } from "react";
import AvailabilityCard from "./AvailabilityCard.jsx";
import { useLecturer } from "./LecturerContext.js";
import ProfileCard from "./ProfileCard.jsx";
import TeachingLoadCard from "./TeachingLoadCard.jsx";

export default function MyProfilePage() {
  const { api, email, isPartTime } = useLecturer();
  const [info, setInfo] = useState(null);
  const [hours, setHours] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .myAvailability()
      .then((a) => !cancelled && setInfo(a))
      .catch((e) => !cancelled && setError(e.message));
    api
      .myHours()
      .then((h) => !cancelled && setHours(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (error) return <div className="p-8 text-sm text-ink-3">{error}</div>;
  if (!info) return <div className="p-8 text-ink-3">Loading…</div>;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto grid max-w-5xl items-start gap-5 lg:grid-cols-[300px_1fr]">
        <ProfileCard info={info} email={email} hours={hours} />
        {isPartTime ? (
          <AvailabilityCard key={JSON.stringify(info.unavailable)} initial={info.unavailable} />
        ) : (
          <TeachingLoadCard hours={hours} />
        )}
      </div>
    </div>
  );
}