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
        parameters: action.parameters,
      }));
    }

    // If planData is an object with steps array
    if (typeof planData === 'object' && planData.steps && Array.isArray(planData.steps)) {
      return planData.steps.map((step, index) => ({
        action: step.description || step.action || `Step ${index + 1}`,
        parameters: step.parameters,
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
                {step.parameters && Object.keys(step.parameters).length > 0 && (
                  <div className="mt-1 space-y-0.5 text-sm text-text-secondary">
                    {Object.entries(step.parameters)
                      // Hide empty values + empty objects/arrays — they add noise.
                      .filter(([, v]) => {
                        if (v == null || v === '') return false;
                        if (Array.isArray(v) && v.length === 0) return false;
                        if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
                        return true;
                      })
                      .map(([key, value]) => {
                        // Format objects / arrays nicely instead of "[object Object]".
                        let display;
                        if (Array.isArray(value)) {
                          display = value.map((v) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
                        } else if (typeof value === 'object') {
                          // For a small object like { currentCompany: "openai" } show "currentCompany: openai"
                          const inner = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ');
                          display = inner || JSON.stringify(value);
                        } else {
                          display = String(value);
                        }
                        return (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium text-text-secondary">{key}:</span>
                            <span className="break-words flex-1 min-w-0">{display}</span>
                          </div>
                        );
                      })}
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

