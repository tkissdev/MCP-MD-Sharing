"use client";

import { useEffect, useRef, useState } from "react";
import { searchOrgCandidateUsers } from "./search-users-action";

export function UserEmailPicker({
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value: string;
  onChange: (email: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const results = await searchOrgCandidateUsers(orgId, value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [orgId, value]);

  function select(email: string) {
    onChange(email);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="email"
        required
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a click on a suggestion registers before the list unmounts.
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <div className="user-picker-dropdown">
          {suggestions.map((email) => (
            <button
              key={email}
              type="button"
              className="user-picker-option"
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimeout.current) clearTimeout(blurTimeout.current);
                select(email);
              }}
            >
              {email}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
