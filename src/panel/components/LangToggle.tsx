// Banter language (v1.3): Hinglish by default, English on the toggle. Remembered in this browser.
import { useRoom } from '../../store/room';
import { setLang } from '../commands';
import { LANG_LABEL, type Lang } from '../../services/lang';

export function LangToggle({ onChange }: { onChange?: (l: Lang) => void }) {
  const lang = useRoom((s) => s.lang);
  const pick = (l: Lang) => { if (onChange) onChange(l); else setLang(l); };
  return (
    <div className="seg" role="group" aria-label="Banter language">
      {(['hi', 'en'] as Lang[]).map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => pick(l)}>{LANG_LABEL[l]}</button>
      ))}
    </div>
  );
}
