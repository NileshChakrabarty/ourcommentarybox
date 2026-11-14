import { useEffect, useState } from 'react';
import { useRoom } from '../../store/room';

export function Toast() {
  const toast = useRoom((s) => s.toast);
  const [shown, setShown] = useState<typeof toast>();
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = setTimeout(() => setShown(undefined), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return shown ? <div className="toast" role="status">{shown.text}</div> : null;
}
