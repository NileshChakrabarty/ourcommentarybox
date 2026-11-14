// Demo-only fake browser window, so reviewers see the product as a layer beside a streaming site.
import type { ReactNode } from 'react';
import './shell.css';

export function BrowserChrome({ children, url = 'watch.example.com/live/nz-v-ind-5th-t20i' }: { children: ReactNode; url?: string }) {
  return (
    <div className="chrome">
      <div className="chrome-bar">
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="url">{url}</span>
        <span className="ext-pill" title="Fun-Banter runs as a side panel next to any stream">Fun-Banter</span>
      </div>
      <div className="chrome-body">{children}</div>
    </div>
  );
}
