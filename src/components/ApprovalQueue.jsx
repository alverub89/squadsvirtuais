import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SuggestionApprovalContent from './SuggestionApprovalContent'
import './ApprovalQueue.css'

export default function ApprovalQueue({ squadId, proposalId, onComplete, onClose }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (proposalId) {
      breakdownProposal()
    } else {
      loadPendingSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId, proposalId, token])

  const breakdownProposal = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/.netlify/functions/suggestion-approvals/breakdown', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ proposal_id: proposalId })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao processar proposta')
      }

      await loadPendingSuggestions()
    } catch (err) {
      console.error('Error breaking down proposal:', err)
      setError(err.message || 'Erro ao processar proposta')
      setLoading(false)
    }
  }

  const loadPendingSuggestions = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/.netlify/functions/suggestion-approvals?squad_id=${squadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao carregar sugestões')
      }

      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Error loading suggestions:', err)
      setError(err.message || 'Erro ao carregar sugestões')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (suggestionId) => {
    setProcessing(true)
    // Wait a bit to allow the modal's approve action to complete
    setTimeout(() => {
      moveToNext()
    }, 500)
  }

  const handleReject = async (suggestionId) => {
    setProcessing(true)
    // Wait a bit to allow the modal's reject action to complete
    setTimeout(() => {
      moveToNext()
    }, 500)
  }

  const moveToNext = () => {
    setProcessing(false)
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // All done
      if (onComplete) onComplete()
    }
  }

  const handleSkip = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      if (onClose) onClose()
    }
  }

  if (loading) {
    return (
      <div className="approval-queue-overlay">
        <div className="approval-queue-loading">
          <div className="approval-queue-loading-spinner"></div>
          <p>Preparando sugestões para aprovação...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="approval-queue-overlay">
        <div className="approval-queue-error">
          <h3>Erro</h3>
          <p>{error}</p>
          <button 
            className="approval-queue-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="approval-queue-overlay">
        <div className="approval-queue-empty">
          <h3>✅ Tudo aprovado!</h3>
          <p>Não há mais sugestões pendentes de aprovação.</p>
          <button 
            className="approval-queue-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  const currentSuggestion = suggestions[currentIndex]

  return (
    <>
      <div className="approval-queue-progress">
        <div className="approval-queue-progress-bar">
          <div 
            className="approval-queue-progress-fill"
            style={{ width: `${((currentIndex + 1) / suggestions.length) * 100}%` }}
          />
        </div>
        <div className="approval-queue-progress-text">
          {currentIndex + 1} de {suggestions.length} sugestões
        </div>
      </div>

      <SuggestionApprovalContent
        suggestion={currentSuggestion}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleSkip}
      />
    </>
  )
}
