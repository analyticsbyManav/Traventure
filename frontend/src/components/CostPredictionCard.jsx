export default function CostPredictionCard({ prediction, isLoading }) {
  if (isLoading) {
    return <div className="cost-card cost-card-loading">Estimating trip cost...</div>;
  }
  if (!prediction) return null;

  const { predicted_cost_inr, confidence_range_inr, model_used, model_r2 } = prediction;

  const formatINR = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="cost-card">
      <div className="cost-card-header">
        <span>Predicted Trip Cost</span>
        <span className="cost-card-badge">ML: {model_used}</span>
      </div>
      <div className="cost-card-amount">{formatINR(predicted_cost_inr)}</div>
      <div className="cost-card-range">
        Likely range: {formatINR(confidence_range_inr.low)} – {formatINR(confidence_range_inr.high)}
      </div>
      <div className="cost-card-footer">Model R² on test data: {model_r2.toFixed(3)}</div>
    </div>
  );
}
