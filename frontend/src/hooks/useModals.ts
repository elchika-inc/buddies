import { useState, useCallback } from 'react'
import { FrontendPet } from '@/types/pet'

/**
 * モーダルの状態管理を行うカスタムフック
 * PetMatchAppから分離して単一責任原則を実現
 */
export function useModals() {
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPet, setSelectedPet] = useState<FrontendPet | null>(null)

  /**
   * 地域選択モーダルを開く
   */
  const openLocationModal = useCallback(() => {
    setLocationModalOpen(true)
  }, [])

  /**
   * 地域選択モーダルを閉じる
   */
  const closeLocationModal = useCallback(() => {
    setLocationModalOpen(false)
  }, [])

  /**
   * ペット詳細モーダルを開く
   */
  const openPetDetailModal = useCallback((pet: FrontendPet) => {
    setSelectedPet(pet)
    setDetailModalOpen(true)
    setLocationModalOpen(false)
  }, [])

  /**
   * ペット詳細モーダルを閉じる
   */
  const closePetDetailModal = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedPet(null)
  }, [])

  /**
   * すべてのモーダルを閉じる
   */
  const closeAllModals = useCallback(() => {
    setLocationModalOpen(false)
    setDetailModalOpen(false)
    setSelectedPet(null)
  }, [])

  return {
    // State
    locationModalOpen,
    detailModalOpen,
    selectedPet,
    // Actions
    openLocationModal,
    closeLocationModal,
    openPetDetailModal,
    closePetDetailModal,
    closeAllModals,
  }
}