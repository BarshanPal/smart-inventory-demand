import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Store,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  BarChart3,
  Sparkles,
  Layers,
  ArrowRight,
  Search,
  X,
  Boxes,
  Activity,
  Check,
  Percent
} from 'lucide-react';
import './App.css';

// Base API URL with fallback
const API_BASE = '/api';

export default function App() {
  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    store: 1,
    item: 1,
  });

  // Data & Async States
  const [predictions, setPredictions] = useState([]);
  const [activePrediction, setActivePrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Modal State for Actual Sales
  const [editingRecord, setEditingRecord] = useState(null);
  const [actualSalesInput, setActualSalesInput] = useState('');
  const [isSubmittingActual, setIsSubmittingActual] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Toast Notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch History from Django Backend
  const fetchPredictions = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/predict/`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setPredictions(Array.isArray(data) ? data : []);
      setBackendOnline(true);
    } catch (err) {
      console.error('Failed to load predictions:', err);
      setBackendOnline(false);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  // Handle Predict Submission
  const handlePredict = async (e) => {
    if (e) e.preventDefault();

    if (!formData.date) {
      showToast('Please select a valid date.', 'error');
      return;
    }
    if (Number(formData.store) < 1) {
      showToast('Store ID must be positive.', 'error');
      return;
    }
    if (Number(formData.item) < 1 || Number(formData.item) > 999) {
      showToast('Item ID must be between 1 and 999.', 'error');
      return;
    }

    setIsPredicting(true);
    try {
      const res = await fetch(`${API_BASE}/predict/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          store: Number(formData.store),
          item: Number(formData.item),
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData.store?.[0] ||
          resData.item?.[0] ||
          resData.date?.[0] ||
          resData.detail ||
          'Failed to generate prediction'
        );
      }

      const newRecord = resData.data;
      setActivePrediction(newRecord);
      showToast('Sales demand predicted successfully!');
      fetchPredictions();
    } catch (err) {
      console.error('Prediction error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Handle Update Actual Sales (PATCH)
  const handleUpdateActual = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const val = parseFloat(actualSalesInput);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid positive number for actual sales.', 'error');
      return;
    }

    setIsSubmittingActual(true);
    try {
      const res = await fetch(`${API_BASE}/actual-sales/${editingRecord.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_sales: val }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.actual_sales?.[0] || 'Failed to update actual sales');
      }

      const updated = await res.json();
      showToast('Actual sales logged successfully!');

      if (activePrediction && activePrediction.id === editingRecord.id) {
        setActivePrediction(updated.data);
      }

      setEditingRecord(null);
      setActualSalesInput('');
      fetchPredictions();
    } catch (err) {
      console.error('Patch error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingActual(false);
    }
  };

  // Quick Scenarios Preset Loader
  const loadScenario = (storeId, itemId, daysOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dateStr = d.toISOString().split('T')[0];
    setFormData({
      date: dateStr,
      store: storeId,
      item: itemId,
    });
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = predictions.length;
    if (total === 0) return { total: 0, avgDemand: 0, trackedCount: 0, mae: 0 };

    const totalDemand = predictions.reduce((sum, p) => sum + (p.predicted_sales || 0), 0);
    const avgDemand = (totalDemand / total).toFixed(1);

    const withActuals = predictions.filter((p) => p.actual_sales !== null && p.actual_sales !== undefined);
    const trackedCount = withActuals.length;

    let mae = 0;
    if (trackedCount > 0) {
      const totalAbsError = withActuals.reduce(
        (sum, p) => sum + Math.abs(p.predicted_sales - p.actual_sales),
        0
      );
      mae = (totalAbsError / trackedCount).toFixed(2);
    }

    return { total, avgDemand, trackedCount, mae };
  }, [predictions]);

  // Filtered Predictions for Table
  const filteredPredictions = useMemo(() => {
    if (!searchTerm.trim()) return predictions;
    const term = searchTerm.toLowerCase();
    return predictions.filter(
      (p) =>
        p.store.toString().includes(term) ||
        p.item.toString().includes(term) ||
        p.date.includes(term) ||
        (p.id && p.id.toString().includes(term))
    );
  }, [predictions, searchTerm]);

  // Data for the Interactive Chart (reversed chronological for display)
  const chartData = useMemo(() => {
    return [...predictions].slice(0, 10).reverse();
  }, [predictions]);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Boxes size={24} />
          </div>
          <div>
            <div className="brand-title">
              Smart Demand Predictor
              <span className="badge-ai">Random Forest ML</span>
            </div>
            <div className="brand-subtitle">
              Intelligent Inventory Forecast & Real-Time Variance Analytics
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-pill">
            <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
            <span>{backendOnline ? 'Django Engine Connected' : 'Engine Offline'}</span>
          </div>
          <button
            className="btn-action"
            onClick={fetchPredictions}
            disabled={isLoadingHistory}
            title="Refresh latest data"
          >
            <RefreshCw size={15} className={isLoadingHistory ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="kpi-label">Total Forecasts</div>
            <div className="kpi-value">{kpis.total}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="kpi-label">Avg Predicted Demand</div>
            <div className="kpi-value">{kpis.avgDemand} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>units</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="kpi-label">Actuals Verified</div>
            <div className="kpi-value">{kpis.trackedCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>records</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Activity size={22} />
          </div>
          <div>
            <div className="kpi-label">Mean Absolute Error</div>
            <div className="kpi-value">{kpis.mae > 0 ? `±${kpis.mae}` : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Forecast Generator & Visual Analytics */}
      <div className="main-grid">
        {/* Left: Input Form Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Sparkles size={18} color="var(--primary)" />
              Generate Demand Prediction
            </div>
            <span className="panel-title-badge">ML Model</span>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="quick-scenarios">
            <div className="scenarios-title">Quick Demo Presets</div>
            <div className="scenarios-list">
              <button
                type="button"
                className="scenario-btn"
                onClick={() => loadScenario(1, 1, 0)}
              >
                Store 1 · Item 1 (Today)
              </button>
              <button
                type="button"
                className="scenario-btn"
                onClick={() => loadScenario(2, 5, 2)}
              >
                Store 2 · Item 5 (+2 Days)
              </button>
              <button
                type="button"
                className="scenario-btn"
                onClick={() => loadScenario(10, 50, 7)}
              >
                Store 10 · Item 50 (+7 Days)
              </button>
            </div>
          </div>

          <form onSubmit={handlePredict}>
            {/* Target Date */}
            <div className="form-group">
              <label className="form-label">
                <span>Target Date</span>
                <span className="hint">Extracts Day, Month, & Weekday</span>
              </label>
              <div className="input-wrapper">
                <Calendar size={17} className="input-icon" />
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="presets-container">
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    const d = new Date().toISOString().split('T')[0];
                    setFormData({ ...formData, date: d });
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setFormData({ ...formData, date: d.toISOString().split('T')[0] });
                  }}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setFormData({ ...formData, date: d.toISOString().split('T')[0] });
                  }}
                >
                  Next Week
                </button>
              </div>
            </div>

            {/* Store Selection */}
            <div className="form-group">
              <label className="form-label">
                <span>Store ID</span>
                <span className="hint">Valid store: 1 - 10</span>
              </label>
              <div className="input-wrapper">
                <Store size={17} className="input-icon" />
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-input"
                  placeholder="e.g. 1"
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  required
                />
              </div>
              <div className="presets-container">
                {[1, 2, 3, 5, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="preset-chip"
                    onClick={() => setFormData({ ...formData, store: s })}
                  >
                    Store {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Selection */}
            <div className="form-group">
              <label className="form-label">
                <span>Item ID</span>
                <span className="hint">Valid item: 1 - 999</span>
              </label>
              <div className="input-wrapper">
                <Package size={17} className="input-icon" />
                <input
                  type="number"
                  min="1"
                  max="999"
                  className="form-input"
                  placeholder="e.g. 10"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  required
                />
              </div>
              <div className="presets-container">
                {[1, 5, 10, 25, 50].map((i) => (
                  <button
                    key={i}
                    type="button"
                    className="preset-chip"
                    onClick={() => setFormData({ ...formData, item: i })}
                  >
                    Item {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-predict"
              disabled={isPredicting}
            >
              {isPredicting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Computing Random Forest Regressor...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Predict Sales Demand</span>
                </>
              )}
            </button>
          </form>

          {/* Active Prediction Result Highlight */}
          {activePrediction && (
            <div className="prediction-result-box">
              <div className="result-glow" />
              <div className="result-header">
                <span className="result-tag">Predicted Demand Result</span>
                <span className="result-meta">
                  Record #{activePrediction.id} · {activePrediction.date}
                </span>
              </div>

              <div className="result-value-row">
                <span className="result-number">
                  {Number(activePrediction.predicted_sales).toFixed(1)}
                </span>
                <span className="result-unit">predicted units</span>
              </div>

              <div className="recommendations-grid">
                <div className="recom-item">
                  <div className="recom-label">Target Store & Item</div>
                  <div className="recom-val">
                    Store #{activePrediction.store} · Item #{activePrediction.item}
                  </div>
                </div>
                <div className="recom-item">
                  <div className="recom-label">Safety Stock (+25%)</div>
                  <div className="recom-val">
                    {Math.ceil(activePrediction.predicted_sales * 1.25)} units
                  </div>
                </div>
                <div className="recom-item">
                  <div className="recom-label">Reorder Level (+50%)</div>
                  <div className="recom-val">
                    {Math.ceil(activePrediction.predicted_sales * 1.5)} units
                  </div>
                </div>
                <div className="recom-item">
                  <div className="recom-label">Actual Sales Logged</div>
                  <div className="recom-val">
                    {activePrediction.actual_sales !== null ? (
                      <span style={{ color: 'var(--success)' }}>
                        {activePrediction.actual_sales} units
                      </span>
                    ) : (
                      <button
                        className="btn-action"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: 2 }}
                        onClick={() => {
                          setEditingRecord(activePrediction);
                          setActualSalesInput('');
                        }}
                      >
                        <Edit3 size={12} /> Log Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Real-Time Visualization & Trends Panel */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <TrendingUp size={18} color="var(--success)" />
              Recent Demand Forecast vs Actuals
            </div>
            <span className="panel-title-badge">Real-Time Visualization</span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Interactive comparison of the 10 most recent predictions and logged actual sales figures.
          </p>

          {/* SVG Interactive Trend Chart */}
          <div className="chart-container">
            {chartData.length === 0 ? (
              <div className="empty-state">
                <BarChart3 size={36} className="empty-state-icon" />
                <p>No predictions recorded yet. Run a prediction to see trend lines.</p>
              </div>
            ) : (
              (() => {
                const maxVal = Math.max(
                  ...chartData.map((d) => Math.max(d.predicted_sales || 0, d.actual_sales || 0)),
                  30
                );
                const chartHeight = 170;
                const chartWidth = 600;
                const padding = { top: 20, right: 30, bottom: 40, left: 40 };
                const plotWidth = chartWidth - padding.left - padding.right;
                const plotHeight = chartHeight - padding.top - padding.bottom;
                const stepX = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth / 2;

                const predPoints = chartData.map((d, i) => ({
                  x: padding.left + (chartData.length > 1 ? i * stepX : plotWidth / 2),
                  y: padding.top + plotHeight - ((d.predicted_sales || 0) / maxVal) * plotHeight,
                  val: d.predicted_sales,
                  label: `S${d.store}-I${d.item}`,
                  date: d.date,
                }));

                const predPath = predPoints.reduce(
                  (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                  ''
                );

                const actPoints = chartData
                  .map((d, i) =>
                    d.actual_sales !== null && d.actual_sales !== undefined
                      ? {
                          x: padding.left + (chartData.length > 1 ? i * stepX : plotWidth / 2),
                          y: padding.top + plotHeight - (d.actual_sales / maxVal) * plotHeight,
                          val: d.actual_sales,
                        }
                      : null
                  )
                  .filter(Boolean);

                return (
                  <>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart-svg">
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = padding.top + plotHeight * (1 - pct);
                        return (
                          <g key={idx}>
                            <line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke="rgba(255,255,255,0.06)"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={padding.left - 8}
                              y={y + 4}
                              fill="var(--text-dim)"
                              fontSize="10"
                              textAnchor="end"
                              fontFamily="var(--font-mono)"
                            >
                              {Math.round(maxVal * pct)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill for Predictions */}
                      {predPoints.length > 1 && (
                        <path
                          d={`${predPath} L ${predPoints[predPoints.length - 1].x} ${
                            padding.top + plotHeight
                          } L ${predPoints[0].x} ${padding.top + plotHeight} Z`}
                          fill="url(#predGradient)"
                        />
                      )}

                      {/* Prediction Line */}
                      <path
                        d={predPath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Prediction Points */}
                      {predPoints.map((p, idx) => (
                        <g key={`p-${idx}`}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2.5" />
                          <text
                            x={p.x}
                            y={chartHeight - 12}
                            fill="var(--text-muted)"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                          >
                            {p.label}
                          </text>
                        </g>
                      ))}

                      {/* Actual Sales Points */}
                      {actPoints.map((p, idx) => (
                        <g key={`a-${idx}`}>
                          <circle cx={p.x} cy={p.y} r="6" fill="#065f46" stroke="#34d399" strokeWidth="2.5" />
                        </g>
                      ))}

                      <defs>
                        <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="chart-legend">
                      <div className="legend-item">
                        <span className="legend-dot pred" />
                        <span>Predicted Sales (Blue Line)</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot act" />
                        <span>Actual Sales (Green Point)</span>
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>

          {/* Quick Insights Banner */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.84rem',
              color: 'var(--text-muted)',
            }}
          >
            <Layers size={18} color="var(--primary)" />
            <span>
              The Random Forest model forecasts sales unit volume based on Store ID, Item ID, Target
              Year, Month, Day, and Day of Week.
            </span>
          </div>
        </div>
      </div>

      {/* Predictions History & Actuals Verification Table */}
      <section className="history-section">
        <div className="history-toolbar">
          <div className="panel-title">
            <Package size={18} color="var(--primary)" />
            Prediction Records & Inventory Tracking
          </div>

          <div className="filter-group">
            <div className="input-wrapper" style={{ width: 240 }}>
              <Search size={15} className="input-icon" />
              <input
                type="text"
                placeholder="Filter by store, item, date..."
                className="search-input"
                style={{ width: '100%', paddingLeft: 38 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="btn-action"
              onClick={fetchPredictions}
              disabled={isLoadingHistory}
            >
              <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Target Date</th>
                <th>Store</th>
                <th>Item</th>
                <th>Predicted Demand</th>
                <th>Actual Sales</th>
                <th>Error Variance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-dim)' }}>
                    No matching prediction records found.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((row) => {
                  const hasActual = row.actual_sales !== null && row.actual_sales !== undefined;
                  const diff = hasActual ? (row.actual_sales - row.predicted_sales).toFixed(2) : null;
                  const absDiff = hasActual ? Math.abs(row.actual_sales - row.predicted_sales) : null;
                  const pctError = hasActual && row.actual_sales > 0
                    ? ((absDiff / row.actual_sales) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={row.id}>
                      <td className="mono-cell" style={{ color: 'var(--text-dim)' }}>
                        #{row.id}
                      </td>
                      <td className="mono-cell">{row.date}</td>
                      <td>
                        <span className="badge-tag blue">Store {row.store}</span>
                      </td>
                      <td>
                        <span className="badge-tag gray">Item {row.item}</span>
                      </td>
                      <td className="mono-cell" style={{ color: '#60a5fa', fontWeight: 600 }}>
                        {Number(row.predicted_sales).toFixed(1)} units
                      </td>
                      <td className="mono-cell">
                        {hasActual ? (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            {row.actual_sales} units
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td className="mono-cell">
                        {hasActual ? (
                          <span
                            style={{
                              color:
                                absDiff <= 3
                                  ? 'var(--success)'
                                  : absDiff <= 8
                                  ? 'var(--warning)'
                                  : 'var(--danger)',
                            }}
                          >
                            {diff > 0 ? `+${diff}` : diff} ({pctError}%)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {hasActual ? (
                          <span className="badge-tag green">
                            <Check size={12} /> Verified
                          </span>
                        ) : (
                          <span className="badge-tag amber">Pending Actuals</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-action"
                          onClick={() => {
                            setEditingRecord(row);
                            setActualSalesInput(row.actual_sales !== null ? row.actual_sales : '');
                          }}
                        >
                          <Edit3 size={13} />
                          <span>{hasActual ? 'Edit' : 'Enter Actual'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Enter or Edit Actual Sales */}
      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Log Actual Sales</div>
              <button
                className="modal-close-btn"
                onClick={() => setEditingRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 18 }}>
              Record #{editingRecord.id} for <strong>Store {editingRecord.store}</strong>,{' '}
              <strong>Item {editingRecord.item}</strong> on <strong>{editingRecord.date}</strong>.
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 18,
                fontSize: '0.85rem',
              }}
            >
              <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>Predicted Volume</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
                {Number(editingRecord.predicted_sales).toFixed(2)} units
              </div>
            </div>

            <form onSubmit={handleUpdateActual}>
              <div className="form-group">
                <label className="form-label">
                  <span>Actual Units Sold</span>
                  <span className="hint">Positive number</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: 14 }}
                  placeholder="e.g. 24.5"
                  value={actualSalesInput}
                  onChange={(e) => setActualSalesInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingActual}
                >
                  {isSubmittingActual ? 'Updating...' : 'Save Actual Sales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
