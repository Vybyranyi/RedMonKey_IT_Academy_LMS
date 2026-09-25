import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Що показати замість дерева, яке впало. reset — спробувати відмалювати його знову */
  fallback: (reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Без ErrorBoundary виняток під час рендеру демонтує весь застосунок, і
 * користувач бачить білий екран. Хуками це не зробити — React ловить помилки
 * рендеру лише в класових компонентах (getDerivedStateFromError).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Помилка рендеру інтерфейсу', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) return this.props.fallback(this.reset);
    return this.props.children;
  }
}
