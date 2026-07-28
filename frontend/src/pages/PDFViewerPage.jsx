import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import ReviewSection from '@/components/ReviewSection';

export default function PDFViewerPage() {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [note, setNote] = useState(location.state?.note || null);
    const [loading, setLoading] = useState(!location.state?.note);
    const [error, setError] = useState(null);
    const [showReviews, setShowReviews] = useState(false);

    useEffect(() => {
        if (!note && noteId) {
            const fetchNote = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(
                        `${import.meta.env.VITE_API_URL}/api/notes/${noteId}`,
                        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
                    );
                    setNote(response.data);
                } catch (err) {
                    setError(err.response?.data?.error || 'Failed to load note');
                } finally {
                    setLoading(false);
                }
            };
            fetchNote();
        }
    }, [noteId, note]);

    // Increment view count once per session per note
    useEffect(() => {
        if (!noteId) return;
        const viewedKey = `viewed_${noteId}`;
        if (sessionStorage.getItem(viewedKey)) return;
        sessionStorage.setItem(viewedKey, '1');
        axios.post(`${import.meta.env.VITE_API_URL}/api/notes/${noteId}/view`).catch(() => {});
    }, [noteId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <FileText className="w-16 h-16 text-red-400" />
                <p className="text-red-500 text-lg">{error}</p>
                <Button onClick={() => navigate('/notes')} variant="outline">
                    Back to Notes
                </Button>
            </div>
        );
    }

    if (!note || !note.fileUrl) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <FileText className="w-16 h-16 text-gray-400" />
                <p className="text-gray-500 text-lg">Note not found</p>
                <Button onClick={() => navigate('/notes')} variant="outline">
                    Back to Notes
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b-2 border-black shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-black transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back
                    </button>
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-800 truncate max-w-md">
                            {note.title}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={`${import.meta.env.VITE_API_URL}/api/notes/${noteId}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button
                            className="border-2 border-black bg-black text-white shadow-[2px_2px_0_#000] hover:bg-gray-800"
                            size="sm"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                        </Button>
                    </a>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReviews(!showReviews)}
                        className="border-2 border-black"
                    >
                        {showReviews ? 'Hide' : 'Show'} Reviews
                    </Button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-200">
                <iframe
                    src={`${note.fileUrl}#toolbar=1&navpanes=1`}
                    className="w-full h-full"
                    title={note.title}
                    style={{ border: 'none' }}
                />
            </div>

            {/* Reviews Section */}
            {showReviews && (
                <div className="border-t-2 border-black bg-white p-4">
                    <ReviewSection noteId={noteId} />
                </div>
            )}
        </div>
    );
}