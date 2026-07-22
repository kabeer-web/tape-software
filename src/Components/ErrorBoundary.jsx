import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-lg text-center bg-white/[0.03] border border-red-500/30 rounded-2xl p-6">
            <AlertTriangle className="text-red-500 mx-auto mb-3" size={32} />
            <p className="text-red-400 font-bold mb-2">Ye page load nahi ho saka</p>
            <p className="text-gray-500 text-xs font-mono break-all">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-[#22c55e] text-black rounded-xl font-bold text-sm"
            >
              Dobara koshish karein
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;