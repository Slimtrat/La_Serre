import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  MediaFrame,
  Progress,
  Select,
  Skeleton,
  Tabs,
  Textarea,
} from "@shared";

import styles from "./ComponentGallery.module.css";

export function ComponentGallery() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldValue, setFieldValue] = useState("Greenhouse sequence");
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState("wide");
  const [tab, setTab] = useState("preview");

  return (
    <main className={styles.gallery} data-component-gallery>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Tentafruit UI</p>
        <h1>Component gallery</h1>
        <p>Shared primitives, interaction contracts, and product states.</p>
      </header>

      <section className={styles.section} aria-labelledby="gallery-actions">
        <h2 id="gallery-actions">Actions and status</h2>
        <div className={styles.row} data-gallery-state="normal">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="danger">Danger action</Button>
          <IconButton icon="⋯" label="More actions" />
          <Badge tone="success">Ready</Badge>
          <Badge tone="warning">Needs review</Badge>
        </div>
        <div className={styles.row} data-gallery-state="loading">
          <Button loading loadingLabel="Saving">Save</Button>
          <Skeleton width="9rem" height="2.5rem" />
          <Progress label="Rendering preview" value={64} showValue />
        </div>
        <div className={styles.row} data-gallery-state="disabled">
          <Button disabled>Unavailable</Button>
          <IconButton disabled icon="×" label="Remove unavailable item" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="gallery-forms">
        <h2 id="gallery-forms">Forms and tabs</h2>
        <div className={styles.formGrid}>
          <Field
            description="A stable name used in the production plan."
            label="Sequence name"
            onChange={setFieldValue}
            value={fieldValue}
          />
          <Select label="Frame format" onChange={setFormat} value={format}>
            <option value="wide">16:9 landscape</option>
            <option value="square">1:1 square</option>
          </Select>
          <Textarea
            error={notes.length > 0 && notes.length < 8 ? "Add a little more detail." : undefined}
            label="Editorial note"
            onChange={setNotes}
            value={notes}
          />
        </div>
        <Tabs
          ariaLabel="Preview modes"
          items={[
            { id: "preview", label: "Preview", panel: "Current generated frame." },
            { id: "metadata", label: "Metadata", panel: "Prompt and generation details." },
            { id: "locked", label: "Locked", panel: null, disabled: true },
          ]}
          onValueChange={setTab}
          value={tab}
        />
      </section>

      <section className={styles.section} aria-labelledby="gallery-surfaces">
        <h2 id="gallery-surfaces">Surfaces and media</h2>
        <div className={styles.grid}>
          <Card elevated>
            <h3>Raised card</h3>
            <p>Reusable surface with semantic spacing and elevation.</p>
          </Card>
          <MediaFrame caption="Preview placeholder" fit="contain">
            <div className={styles.mediaPlaceholder}>16:9</div>
          </MediaFrame>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="gallery-feedback">
        <h2 id="gallery-feedback">Product states</h2>
        <div className={styles.grid}>
          <div data-gallery-state="empty">
            <EmptyState
              action={<Button variant="secondary">Create first item</Button>}
              description="Start by adding one item to this collection."
              title="Nothing here yet"
            />
          </div>
          <div data-gallery-state="error">
            <ErrorState
              action={<Button variant="secondary">Try again</Button>}
              description="The latest data could not be loaded."
              title="Loading failed"
            />
          </div>
          <Card className={styles.stale} data-gallery-state="stale">
            <Badge tone="warning">Stale</Badge>
            <h3>Preview may be outdated</h3>
            <p>Refresh it before approving the sequence.</p>
            <Button variant="secondary">Refresh preview</Button>
          </Card>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="gallery-overlays">
        <h2 id="gallery-overlays">Overlays</h2>
        <div className={styles.row}>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button onClick={() => setDrawerOpen(true)} variant="secondary">Open drawer</Button>
          <Button onClick={() => setConfirmOpen(true)} variant="danger">Open confirmation</Button>
        </div>
      </section>

      <Dialog
        description="Focus stays inside until the surface closes."
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        title="Dialog example"
      >
        <Button onClick={() => setDialogOpen(false)}>Close dialog</Button>
      </Dialog>
      <Drawer
        description="A complementary task surface."
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
        title="Drawer example"
      >
        <Button onClick={() => setDrawerOpen(false)}>Close drawer</Button>
      </Drawer>
      <ConfirmAction
        cancelLabel="Keep item"
        confirmLabel="Delete item"
        description="This sample demonstrates a destructive confirmation."
        onConfirm={() => setConfirmOpen(false)}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Delete this item?"
      />
    </main>
  );
}
