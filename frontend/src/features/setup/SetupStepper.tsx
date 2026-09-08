import type { SetupMessages } from "./messages";
import styles from "./SetupWizard.module.css";

export function SetupStepper({ current, messages }: { current: number; messages: SetupMessages }) {
  return (
    <nav aria-label={messages.title} className={styles.stepper}>
      <ol>
        {messages.steps.map((step, index) => (
          <li aria-current={index === current ? "step" : undefined} data-complete={index < current} key={step}>
            <span aria-hidden="true">{index < current ? "✓" : index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </nav>
  );
}
