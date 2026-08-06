import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import type { ListCardResponse } from '../../services/listCardServices';

interface EditCardModelProps {
    card: ListCardResponse;
    open: boolean
    onOpenChange: (open: boolean) => void
}

export const EditCardModel: React.FC<EditCardModelProps> = (props) => {
    const { card, open, onOpenChange } = props;

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
