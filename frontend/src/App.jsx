import React, { useState } from 'react';
import './index.css';
import LandingPage from './LandingPage';
import ResultsDashboard from './ResultsDashboard';

export default function App() {
  const [selection, setSelection] = useState(null);

  return selection
    ? <ResultsDashboard selection={selection} onBack={() => setSelection(null)} />
    : <LandingPage onSearch={setSelection} />;
}
