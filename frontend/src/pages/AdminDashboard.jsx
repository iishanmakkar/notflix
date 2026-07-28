import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, XCircle, Clock, FileText, User, Shield, Trash2 } from 'lucide-react';
import RateLimitMonitor from '../components/RateLimitMonitor';

export default function AdminDashboard() {
    const [pendingNotes, setPendingNotes] = useState([]);
    const [allNotes, setAllNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewComment, setReviewComment] = useState('');
    const [selectedNote, setSelectedNote] = useState(null);
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'rate-limits'

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const [pendingRes, allRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/notes/admin/pending`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/notes/admin/all`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            setPendingNotes(pendingRes.data);
            setAllNotes(Array.isArray(allRes.data) ? allRes.data : allRes.data.notes || []);
            setLoading(false);
        } catch {
            setError('Error fetching notes');
            setLoading(false);
        }
    };

    const handleReview = async (noteId, status) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/notes/admin/review/${noteId}`,
                { 
                    status, 
                    reviewComment: reviewComment.trim() 
                },
                { 
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
                }
            );
            setReviewComment('');
            setSelectedNote(null);
            fetchNotes();
        } catch {
            setError('Error reviewing note');
        }
    };

    const handleDelete = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/notes/${noteId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchNotes();
        } catch (err) {
            console.error('Delete error:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Error deleting note');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="flex justify-center items-center min-h-screen text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            {error}
        </div>
    );

    return (
        <div className="neo-admin container mx-auto px-4 py-12">
            <h1 className="font-display text-5xl mb-8">REVIEW DESK.</h1>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                        activeTab === 'notes'
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Notes Management
                </button>
                <button
                    onClick={() => setActiveTab('rate-limits')}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                        activeTab === 'rate-limits'
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <Shield className="w-4 h-4 mr-2" />
                    Rate Limits
                </button>
            </div>

            {/* Notes Management Tab */}
            {activeTab === 'notes' && (
                <>
                    {/* Pending Notes Section */}
                    <section className="mb-12">
                        <div className="flex items-center mb-6">
                            <Clock className="w-6 h-6 mr-2 text-[#b7c6c2]" />
                            <h2 className="text-2xl font-semibold">Pending Reviews</h2>
                        </div>
                        
                        <div className="grid gap-6">
                            {pendingNotes.map((note) => (
                                <Card key={note._id} className="border-2 border-black bg-[#b7c6c2]/50">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl">{note.title}</CardTitle>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <User className="w-4 h-4 mr-1" />
                                                        {note.uploadedBy?.name || 'Unknown User'}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FileText className="w-4 h-4 mr-1" />
                                                        {note.subject}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className="bg-[#b7c6c2] text-black">
                                                Pending Review
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-700 mb-4">{note.content}</p>
                                        
                                        {selectedNote === note._id ? (
                                            <div className="space-y-4">
                                                <Textarea
                                                    placeholder="Add a review comment (optional)"
                                                    value={reviewComment}
                                                    onChange={(e) => setReviewComment(e.target.value)}
                                                    className="w-full"
                                                />
                                                <div className="flex space-x-4">
                                                    <Button
                                                        onClick={() => handleReview(note._id, 'approved')}
                                                        className="bg-green-500 hover:bg-green-600"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleReview(note._id, 'rejected')}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedNote(null);
                                                            setReviewComment('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(note._id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => setSelectedNote(note._id)}
                                                    className="flex-1"
                                                >
                                                    Review Note
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(note._id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                            {pendingNotes.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p>No pending notes to review</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* All Notes Section */}
                    <section>
                        <div className="flex items-center mb-6">
                            <FileText className="w-6 h-6 mr-2 text-blue-500" />
                            <h2 className="text-2xl font-semibold">All Notes</h2>
                        </div>
                        
                        <div className="grid gap-6">
                            {allNotes.map((note) => (
                                <Card key={note._id} className="border border-gray-200">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl">{note.title}</CardTitle>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <User className="w-4 h-4 mr-1" />
                                                        {note.uploadedBy?.name || 'Unknown User'}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FileText className="w-4 h-4 mr-1" />
                                                        {note.subject}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={
                                                note.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                note.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-[#b7c6c2] text-black'
                                            }>
                                                {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-700 mb-4">{note.content}</p>
                                        {note.reviewComment && (
                                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-semibold">Review Comment:</span> {note.reviewComment}
                                                </p>
                                            </div>
                                        )}
<div className="text-sm text-gray-500">
                                            <p>Uploaded: {new Date(note.createdAt).toLocaleDateString()}</p>
                                            {note.reviewedAt && (
                                                <p>Reviewed: {new Date(note.reviewedAt).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="mt-4"
                                            onClick={() => handleDelete(note._id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* Rate Limits Tab */}
            {activeTab === 'rate-limits' && (
                <RateLimitMonitor />
            )}
        </div>
    );
} 
