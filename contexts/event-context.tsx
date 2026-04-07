"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  status: string;
}

interface EventContextType {
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
}

const EventContext = createContext<EventContextType>({
  activeEvent: null,
  setActiveEvent: () => {},
});

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [activeEvent, setActiveEventState] = useState<Event | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("nightcontrol-active-event");
    if (stored) {
      try {
        setActiveEventState(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const setActiveEvent = (event: Event | null) => {
    setActiveEventState(event);
    if (event) {
      localStorage.setItem("nightcontrol-active-event", JSON.stringify(event));
    } else {
      localStorage.removeItem("nightcontrol-active-event");
    }
  };

  return (
    <EventContext.Provider value={{ activeEvent, setActiveEvent }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  return useContext(EventContext);
}
