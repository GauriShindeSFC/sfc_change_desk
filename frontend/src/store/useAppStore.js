// Client State Store Helper
import { useState } from 'react';

export const useAppStore = (initialRoute = 'Dashboard') => {
  const [activeRoute, setActiveRoute] = useState(initialRoute);
  const [userProfile] = useState({
    name: 'Gauri Shinde',
    role: 'Change Manager',
    initials: 'GS'
  });

  return {
    activeRoute,
    setActiveRoute,
    userProfile
  };
};
