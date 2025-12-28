import SuggestionApprovalModal from './SuggestionApprovalModal'

function DecisionContextContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Por que agora?</label>
          <div className="suggestion-modal-field-value">{payload.why_now}</div>
        </div>
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">O que está em risco?</label>
          <div className="suggestion-modal-field-value">{payload.what_is_at_risk}</div>
        </div>
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Horizonte de Decisão</label>
          <div className="suggestion-modal-field-value">{payload.decision_horizon}</div>
        </div>
      </div>
    </>
  )
}

function ProblemMaturityContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Estágio Atual</label>
          <div className="suggestion-modal-field-value">{payload.current_stage}</div>
        </div>
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Nível de Confiança</label>
          <div className="suggestion-modal-field-value">{payload.confidence_level}</div>
        </div>
        {payload.main_gaps && payload.main_gaps.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Principais Gaps</label>
            <ul className="suggestion-modal-field-list">
              {payload.main_gaps.map((gap, idx) => (
                <li key={idx}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

function PersonaContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Nome</label>
          <div className="suggestion-modal-field-value">{payload.name}</div>
        </div>
        {payload.type && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Tipo</label>
            <div className="suggestion-modal-field-value">{payload.type}</div>
          </div>
        )}
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Descrição</label>
          <div className="suggestion-modal-field-value">{payload.description}</div>
        </div>
        {payload.goals && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Objetivos</label>
            <div className="suggestion-modal-field-value">{payload.goals}</div>
          </div>
        )}
        {payload.pain_points && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Dores</label>
            <div className="suggestion-modal-field-value">{payload.pain_points}</div>
          </div>
        )}
      </div>
    </>
  )
}

function GovernanceContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        {payload.decision_rules && payload.decision_rules.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Regras de Decisão</label>
            <ul className="suggestion-modal-field-list">
              {payload.decision_rules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.non_negotiables && payload.non_negotiables.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Não Negociáveis</label>
            <ul className="suggestion-modal-field-list">
              {payload.non_negotiables.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

function SquadStructureRoleContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Papel</label>
          <div className="suggestion-modal-field-value">{payload.role || payload.label}</div>
        </div>
        {payload.description && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Descrição</label>
            <div className="suggestion-modal-field-value">{payload.description}</div>
          </div>
        )}
        {payload.accountability && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Accountability</label>
            <div className="suggestion-modal-field-value">{payload.accountability}</div>
          </div>
        )}
        {payload.responsibility && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Responsabilidade</label>
            <div className="suggestion-modal-field-value">{payload.responsibility}</div>
          </div>
        )}
      </div>
    </>
  )
}

function PhaseContent({ payload }) {
  const phases = Array.isArray(payload) ? payload : [payload]
  
  return (
    <>
      <div className="suggestion-modal-section">
        <p className="suggestion-modal-subtitle" style={{ marginBottom: '1rem' }}>
          A IA sugere as seguintes fases para o roteiro de trabalho:
        </p>
        {phases.map((phase, idx) => (
          <div key={idx} className="suggestion-modal-card">
            <h4 className="suggestion-modal-card-title">
              {phase.order || idx + 1}. {phase.name}
            </h4>
            {phase.description && (
              <p className="suggestion-modal-card-text">{phase.description}</p>
            )}
            {phase.objective && (
              <p className="suggestion-modal-card-text" style={{ marginTop: '0.5rem' }}>
                <strong>Objetivo:</strong> {phase.objective}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function CriticalUnknownContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Pergunta</label>
          <div className="suggestion-modal-field-value">{payload.question}</div>
        </div>
        {payload.why_it_matters && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Por que importa?</label>
            <div className="suggestion-modal-field-value">{payload.why_it_matters}</div>
          </div>
        )}
        {payload.how_to_reduce && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Como reduzir incerteza?</label>
            <div className="suggestion-modal-field-value">{payload.how_to_reduce}</div>
          </div>
        )}
      </div>
    </>
  )
}

function ExecutionModelContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        {payload.approach && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Abordagem</label>
            <div className="suggestion-modal-field-value">{payload.approach}</div>
          </div>
        )}
        {payload.constraints && payload.constraints.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Restrições</label>
            <ul className="suggestion-modal-field-list">
              {payload.constraints.map((constraint, idx) => (
                <li key={idx}>{constraint}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.responsibilities && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Responsabilidades</label>
            <div className="suggestion-modal-field-value">{payload.responsibilities}</div>
          </div>
        )}
      </div>
    </>
  )
}

function ValidationStrategyContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        {payload.signals_to_stop && payload.signals_to_stop.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Sinais de Parada</label>
            <ul className="suggestion-modal-field-list">
              {payload.signals_to_stop.map((signal, idx) => (
                <li key={idx}>{signal}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.signals_of_confidence && payload.signals_of_confidence.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Sinais de Confiança</label>
            <ul className="suggestion-modal-field-list">
              {payload.signals_of_confidence.map((signal, idx) => (
                <li key={idx}>{signal}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

function ReadinessAssessmentContent({ payload }) {
  return (
    <>
      <div className="suggestion-modal-section">
        <div className="suggestion-modal-field">
          <label className="suggestion-modal-field-label">Squad está pronta?</label>
          <div className="suggestion-modal-field-value">
            {payload.is_ready_to_build_product ? '✅ Sim, pronta para produção' : '⚠️ Não, ainda em preparação'}
          </div>
        </div>
        {payload.conditions && payload.conditions.length > 0 && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Condições</label>
            <ul className="suggestion-modal-field-list">
              {payload.conditions.map((condition, idx) => (
                <li key={idx}>{condition}</li>
              ))}
            </ul>
          </div>
        )}
        {payload.recommendations && (
          <div className="suggestion-modal-field">
            <label className="suggestion-modal-field-label">Recomendações</label>
            <div className="suggestion-modal-field-value">{payload.recommendations}</div>
          </div>
        )}
      </div>
    </>
  )
}

export default function SuggestionApprovalContent({ suggestion, onApprove, onReject, onClose }) {
  const renderContent = () => {
    const payload = suggestion.payload

    switch (suggestion.type) {
      case 'decision_context':
        return <DecisionContextContent payload={payload} />
      case 'problem_maturity':
        return <ProblemMaturityContent payload={payload} />
      case 'persona':
        return <PersonaContent payload={payload} />
      case 'governance':
        return <GovernanceContent payload={payload} />
      case 'squad_structure_role':
        return <SquadStructureRoleContent payload={payload} />
      case 'phase':
        return <PhaseContent payload={payload} />
      case 'critical_unknown':
        return <CriticalUnknownContent payload={payload} />
      case 'execution_model':
        return <ExecutionModelContent payload={payload} />
      case 'validation_strategy':
        return <ValidationStrategyContent payload={payload} />
      case 'readiness_assessment':
        return <ReadinessAssessmentContent payload={payload} />
      default:
        return <div>Tipo de sugestão desconhecido: {suggestion.type}</div>
    }
  }

  return (
    <SuggestionApprovalModal
      suggestion={suggestion}
      onApprove={onApprove}
      onReject={onReject}
      onClose={onClose}
    >
      {renderContent()}
    </SuggestionApprovalModal>
  )
}
