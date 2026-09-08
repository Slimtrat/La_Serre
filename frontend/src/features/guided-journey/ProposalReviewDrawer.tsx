import { useState } from "react";

import { Button, Drawer } from "@shared";

import type { GuidedProposal } from "./model";
import styles from "./guidedJourney.module.css";

export interface ProposalReviewDrawerProps {
  readonly proposal: GuidedProposal | null;
  readonly busy: boolean;
  readonly onAccept: (edited: Readonly<Record<string, unknown>>) => void;
  readonly onClose: () => void;
  readonly onReject: () => void;
}

export function ProposalReviewDrawer({ proposal, busy, onAccept, onClose, onReject }: ProposalReviewDrawerProps) {
  const [edited, setEdited] = useState("");
  if (!proposal) return null;
  const candidate = edited || JSON.stringify(proposal.after, null, 2);
  return (
    <Drawer open onOpenChange={(open) => { if (!open) onClose(); }} title="Proposition — non appliquée">
      <div className={styles.reviewGrid}>
        <section><h3>Avant</h3><pre>{JSON.stringify(proposal.before, null, 2)}</pre></section>
        <section>
          <h3>Après — modifiable</h3>
          <textarea aria-label="Proposition modifiable" onChange={(event) => setEdited(event.currentTarget.value)} value={candidate} />
        </section>
      </div>
      <p>Modèle : {proposal.model}</p>
      <div className={styles.actions}>
        <Button disabled={busy} onClick={onReject} variant="ghost">Refuser</Button>
        <Button disabled={busy} onClick={() => onAccept(JSON.parse(candidate))}>Appliquer mes modifications</Button>
      </div>
    </Drawer>
  );
}
