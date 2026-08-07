import React, { useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Calendar1, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DateTimeInputProps {
    value?: string | Date | null;
    onChange?: (date: Date | null) => void;
    className?: string;
    style?: React.CSSProperties;
}

export const DateTimeInput = ({ value, onChange, className, style }: DateTimeInputProps) => {
    const [open, setOpen] = React.useState(false);
    const [date, setDate] = React.useState<Date | undefined>(undefined);
    const [hour, setHour] = React.useState<string>("00");
    const [min, setMin] = React.useState<string>("00");

    // Parse value prop safely whether it's a string, Date, null, or undefined
    const parsedDate = React.useMemo(() => {
        if (!value) return null;
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        if (typeof value === 'string') {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    }, [value]);

    // Sync state when parsedDate prop changes
    useEffect(() => {
        if (parsedDate) {
            setDate(parsedDate);
            setHour(parsedDate.getHours().toString().padStart(2, "0"));
            setMin(parsedDate.getMinutes().toString().padStart(2, "0"));
        } else {
            setDate(undefined);
            setHour("00");
            setMin("00");
        }
    }, [parsedDate]);

    // Emit date change helper
    const emitChange = (newDate: Date | undefined, newHour: string, newMin: string) => {
        if (!newDate) {
            onChange?.(null);
            return;
        }
        const h = parseInt(newHour, 10) || 0;
        const m = parseInt(newMin, 10) || 0;
        const result = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), h, m);
        onChange?.(result);
    };

    const handleSelectDate = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        emitChange(selectedDate, hour, min);
    };

    const handleUpHour = () => {
        const current = parseInt(hour, 10) || 0;
        const next = (current >= 23 ? 0 : current + 1).toString().padStart(2, "0");
        setHour(next);
        emitChange(date, next, min);
    };

    const handleDownHour = () => {
        const current = parseInt(hour, 10) || 0;
        const next = (current <= 0 ? 23 : current - 1).toString().padStart(2, "0");
        setHour(next);
        emitChange(date, next, min);
    };

    const handleUpMin = () => {
        const current = parseInt(min, 10) || 0;
        const next = (current >= 59 ? 0 : current + 1).toString().padStart(2, "0");
        setMin(next);
        emitChange(date, hour, next);
    };

    const handleDownMin = () => {
        const current = parseInt(min, 10) || 0;
        const next = (current <= 0 ? 59 : current - 1).toString().padStart(2, "0");
        setMin(next);
        emitChange(date, hour, next);
    };

    const handleInputHour = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (val.length > 2) {
            val = val.slice(-1);
        }

        if (!/^\d{0,2}$/.test(val)) return;

        if (val === '') {
            setHour('');
            return;
        }

        const num = parseInt(val, 10);
        if (num >= 0 && num <= 23) {
            setHour(val);
            emitChange(date, val, min);
        }
    };

    const handleBlurHour = () => {
        let finalHour = "00";
        if (hour && !isNaN(parseInt(hour, 10))) {
            const num = Math.min(23, Math.max(0, parseInt(hour, 10)));
            finalHour = num.toString().padStart(2, "0");
        }
        setHour(finalHour);
        emitChange(date, finalHour, min);
    };

    const handleInputMin = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (val.length > 2) {
            val = val.slice(-1);
        }

        if (!/^\d{0,2}$/.test(val)) return;

        if (val === '') {
            setMin('');
            return;
        }

        const num = parseInt(val, 10);
        if (num >= 0 && num <= 59) {
            setMin(val);
            emitChange(date, hour, val);
        }
    };

    const handleBlurMin = () => {
        let finalMin = "00";
        if (min && !isNaN(parseInt(min, 10))) {
            const num = Math.min(59, Math.max(0, parseInt(min, 10)));
            finalMin = num.toString().padStart(2, "0");
        }
        setMin(finalMin);
        emitChange(date, hour, finalMin);
    };

    const handleClearTime = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDate(undefined);
        setHour("00");
        setMin("00");
        onChange?.(null);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="w-full">
                <Button
                    type="button"
                    style={style}
                    className={cn(
                        "cursor-pointer flex text-gray-600 items-center justify-between gap-2 border border-gray-300 text-xs",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        <Calendar1 className='h-4 w-4 shrink-0' />
                        <span>
                            {date
                                ? `${date.toLocaleDateString()} ${hour}:${min}`
                                : 'Select date & time'}
                        </span>
                    </div>
                    {date && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClearTime}
                            className="p-0.5 hover:bg-slate-200 rounded-full cursor-pointer transition-colors shrink-0"
                            title="Clear date & time"
                        >
                            <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" />
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className='bg-white border w-fit p-4 shadow-xl rounded-xl space-y-3' align="start">
                <div className='flex gap-4 items-center'>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleSelectDate}
                        className="rounded-lg border"
                        captionLayout="dropdown"
                    />
                    <div className='flex gap-2 items-center pl-2 border-l border-slate-200'>
                        {/* Hour Column */}
                        <div className='flex flex-col gap-2 items-center'>
                            <Button type="button" onClick={handleUpHour} size="icon" variant="ghost" className='bg-slate-100 hover:bg-slate-200 cursor-pointer h-8 w-8'>
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <input
                                type="text"
                                value={hour}
                                onChange={handleInputHour}
                                onBlur={handleBlurHour}
                                onFocus={(e) => e.target.select()}
                                maxLength={2}
                                className='border border-slate-300 outline-none w-10 text-center px-1 py-1 rounded text-sm font-semibold focus:ring-2 focus:ring-blue-500'
                            />
                            <Button type="button" onClick={handleDownHour} size="icon" variant="ghost" className='bg-slate-100 hover:bg-slate-200 cursor-pointer h-8 w-8'>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>

                        <span className='font-bold text-slate-700 pb-1'>:</span>

                        {/* Minute Column */}
                        <div className='flex flex-col gap-2 items-center'>
                            <Button type="button" onClick={handleUpMin} size="icon" variant="ghost" className='bg-slate-100 hover:bg-slate-200 cursor-pointer h-8 w-8'>
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <input
                                type="text"
                                value={min}
                                onChange={handleInputMin}
                                onBlur={handleBlurMin}
                                onFocus={(e) => e.target.select()}
                                maxLength={2}
                                className='border border-slate-300 outline-none w-10 text-center px-1 py-1 rounded text-sm font-semibold focus:ring-2 focus:ring-blue-500'
                            />
                            <Button type="button" onClick={handleDownMin} size="icon" variant="ghost" className='bg-slate-100 hover:bg-slate-200 cursor-pointer h-8 w-8'>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions: Clear time & Save */}
                <div className='flex items-center justify-between pt-2 border-t border-slate-100'>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearTime}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer h-8 px-2.5 font-medium"
                    >
                        Clear time
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer h-8 px-3 font-semibold"
                    >
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
