import React from 'react';
import ButtonPlain from './ButtonPlain';

const ButtonGroup = ({
  buttons,
  className = '',
}) => {
  return (
    <div className={`inline-flex rounded-lg overflow-hidden border border-border-muted ${className}`}>
      {buttons.map((button, index) => {
        const { key, ...buttonProps } = button;
        const isFirst = index === 0;
        const isLast = index === buttons.length - 1;

        return (
          <ButtonPlain
            key={key}
            {...buttonProps}
            className={`rounded-none border-0 ${
              !isFirst ? 'border-l border-border-muted' : ''
            } ${buttonProps.className || ''}`}
          />
        );
      })}
    </div>
  );
};

export default ButtonGroup;

