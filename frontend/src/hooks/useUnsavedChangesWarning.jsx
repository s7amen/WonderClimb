import { useEffect, useState } from 'react';
import BaseModal from '../components/UI/BaseModal';
import Button from '../components/UI/Button';

/**
 * Custom hook for warning users about unsaved changes
 * Provides browser navigation warning and modal close confirmation
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.hasChanges - Function that returns true if there are unsaved changes
 * @param {string} options.message - Custom warning message (optional)
 * @returns {Object} Hook state and components
 */
export const useUnsavedChangesWarning = ({
    hasChanges,
    message = "Имате незапазени промени. Сигурни ли сте, че искате да излезете без да ги запазите?"
} = {}) => {
    const [showWarning, setShowWarning] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Browser navigation warning (beforeunload)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges && hasChanges()) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasChanges]);

    /**
     * Confirm close action with warning if there are unsaved changes
     * @param {Function} onClose - Function to call if user confirms
     */
    const confirmClose = (onClose) => {
        if (hasChanges && hasChanges()) {
            setPendingAction(() => onClose);
            setShowWarning(true);
        } else {
            onClose();
        }
    };

    /**
     * Handle user confirming they want to discard changes
     */
    const handleConfirmDiscard = () => {
        setShowWarning(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    /**
     * Handle user canceling the discard action
     */
    const handleCancelDiscard = () => {
        setShowWarning(false);
        setPendingAction(null);
    };

    /**
     * Warning modal component to render
     */
    const UnsavedChangesModal = () => (
        <BaseModal
            isOpen={showWarning}
            onClose={handleCancelDiscard}
            title="Незапазени промени"
            size="sm"
            footer={
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="secondary"
                        onClick={handleCancelDiscard}
                    >
                        Отказ
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirmDiscard}
                    >
                        Излез без запазване
                    </Button>
                </div>
            }
        >
            <p className="text-sm text-gray-700">
                {message}
            </p>
        </BaseModal>
    );

    return {
        // Functions
        confirmClose,

        // Components
        UnsavedChangesModal,

        // State (for manual control if needed)
        showWarning,
        setShowWarning,
    };
};

export default useUnsavedChangesWarning;
