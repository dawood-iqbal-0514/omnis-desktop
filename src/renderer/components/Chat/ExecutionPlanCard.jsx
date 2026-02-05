import React from 'react';
import { ButtonPlain } from '../Button';

const ExecutionPlanCard = ({ plan, onApprove, onEdit }) => {
  // Parse plan from message if it's a string
  const parsePlan = (planData) => {
    if (!planData) return null;

    // If planData is an object with actions array
    if (typeof planData === 'object' && planData.actions && Array.isArray(planData.actions)) {
      return planData.actions.map((action, index) => ({
        action: action.description || action.actionId || `Action ${index + 1}`,
        details: Object.entries(action.parameters || {}).map(([key, value]) => `${key}: ${value}`),
        parameters: action.parameters
      }));
    }

    // If planData is an object with steps array
    if (typeof planData === 'object' && planData.steps && Array.isArray(planData.steps)) {
      return planData.steps.map((step, index) => ({
        action: step.description || step.action || `Step ${index + 1}`,
        details: Object.entries(step.parameters || {}).map(([key, value]) => `${key}: ${value}`),
        parameters: step.parameters
      }));
    }

    if (typeof planData === 'string') {
      // Try to extract plan from message
      const lines = planData.split('\n');
      const steps = [];
      let currentStep = null;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.match(/^\d+\./)) {
          // New step
          if (currentStep) {
            steps.push(currentStep);
          }
          currentStep = {
            action: trimmed.replace(/^\d+\.\s*/, ''),
            details: []
          };
        } else if (trimmed && currentStep && trimmed.startsWith('-')) {
          currentStep.details.push(trimmed.replace(/^-\s*/, ''));
        }
      });

      if (currentStep) {
        steps.push(currentStep);
      }

      return steps.length > 0 ? steps : null;
    }

    return null;
  };

  const planSteps = parsePlan(plan);

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-6 my-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📋</span>
        <h3 className="text-lg font-semibold text-text-primary">Execution Plan</h3>
      </div>

      {planSteps && planSteps.length > 0 ? (
        <div className="space-y-3 mb-6">
          {planSteps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-accent text-white flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-medium">{step.action || step.description || `Step ${index + 1}`}</p>
                {step.details && step.details.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="text-sm text-text-secondary">
                        - {detail}
                      </li>
                    ))}
                  </ul>
                )}
                {step.parameters && (
                  <div className="mt-2 text-sm text-text-secondary">
                    {Object.entries(step.parameters).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-text-secondary whitespace-pre-wrap">{typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2)}</p>
        </div>
      )}

      <div className="flex gap-3">
        <ButtonPlain
          variant="primary"
          onClick={onApprove}
          className="flex-1"
        >
          Approve
        </ButtonPlain>
        <ButtonPlain
          variant="secondary"
          onClick={onEdit}
          className="flex-1"
        >
          Edit
        </ButtonPlain>
      </div>
    </div>
  );
};

export default ExecutionPlanCard;

