import { useRoom } from '../../store/room';

/** Required credits: match video © ECB via YouTube; ball-by-ball data from Cricsheet (ODC-By). */
export function Attribution({ className = '' }: { className?: string }) {
  const match = useRoom((s) => s.match);
  if (!match) return null;
  return (
    <footer className={`attribution ${className}`}>
      Match video © <a href={match.video?.url} target="_blank" rel="noreferrer">{match.video?.owner ?? 'ECB'}</a>, played from YouTube.
      {' '}Ball-by-ball data from <a href={match.source.url} target="_blank" rel="noreferrer">Cricsheet</a> ({match.source.licence}).
      {' '}Ball descriptions and the gang's lines are original.
    </footer>
  );
}
