/** Illustrative public proposal; never represents a real account or payment. */
export function AgreementPreview() {
  return (
    <aside className="agreement-preview" aria-label="Example project agreement">
      <div className="agreement-preview-label">
        <span>Example proposal</span>
        <span>Not funded</span>
      </div>
      <h2>E-commerce website</h2>
      <p>Four milestones. One shared scope.</p>
      <dl>
        {[
          ["Discovery & design", "$150"],
          ["Frontend development", "$250"],
          ["Backend & integrations", "$400"],
          ["Testing & delivery", "$200"],
        ].map(([title, amount]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{amount}</dd>
          </div>
        ))}
        <div className="agreement-preview-total">
          <dt>Proposed budget</dt>
          <dd>
            $1,000 <small>USD</small>
          </dd>
        </div>
      </dl>
      <div className="agreement-preview-note">
        AI suggestion · both partners review before funding
      </div>
    </aside>
  );
}
