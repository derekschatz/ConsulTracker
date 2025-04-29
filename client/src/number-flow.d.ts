declare module '@number-flow/react' {
  export interface NumberFlowProps {
    value: number;
    format?: Intl.NumberFormatOptions;
    transformTiming?: {
      duration: number;
      easing: string;
    };
    willChange?: boolean;
    className?: string;
  }

  const NumberFlow: React.FC<NumberFlowProps>;
  export default NumberFlow;
} 