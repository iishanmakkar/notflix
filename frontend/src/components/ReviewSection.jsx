import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, Edit, Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ReviewSection({ noteId, initialRating, initialReviewCount, initialUserReview }) {
    const { user, token } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userReview, setUserReview] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [editing, setEditing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [stats, setStats] = useState({ rating: initialRating, reviewCount: initialReviewCount });
    const [reviewLoading, setReviewLoading] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!user || !token || !noteId) return;
        setReviewLoading(true);
        axios.get(`${apiUrl}/api/reviews/${noteId}/user`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(response => {
            setUserReview(response.data.review);
            setRating(response.data.review.rating);
            setComment(response.data.review.comment || '');
        }).catch(() => {}).finally(() => setReviewLoading(false));
    }, [noteId, user, token]);

    const fetchReviews = async (pageNum = 1) => {
        setLoading(true);
        try {
            const response = await axios.get(`${apiUrl}/api/reviews/${noteId}`, {
                params: { page: pageNum, limit: 10 }
            });
            if (pageNum === 1) {
                setReviews(response.data.reviews);
            } else {
                setReviews(prev => [...prev, ...response.data.reviews]);
            }
            setHasMore(pageNum < response.data.pagination.totalPages);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to fetch reviews', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/notes/${noteId}`);
            if (response.data.rating !== undefined) {
                setStats({ rating: response.data.rating, reviewCount: response.data.reviewCount });
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return;
        setSubmitting(true);
        try {
            if (editing) {
                await axios.put(`${apiUrl}/api/reviews/${userReview._id}`, { rating, comment }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                const response = await axios.post(`${apiUrl}/api/reviews/${noteId}`, { rating, comment }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserReview(response.data.review);
            }
            setEditing(false);
            setRating(0);
            setComment('');
            fetchReviews(1);
            fetchStats();
        } catch (err) {
            console.error('Failed to submit review', err);
            alert(err.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = () => {
        setEditing(true);
        setRating(userReview.rating);
        setComment(userReview.comment);
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete your review?')) return;
        try {
            await axios.delete(`${apiUrl}/api/reviews/${userReview._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserReview(null);
            fetchReviews(1);
            fetchStats();
        } catch (err) {
            alert('Failed to delete review');
        }
    };

    const loadMore = () => {
        fetchReviews(page + 1);
    };

    const renderStars = (value, size = 'w-5 h-5', interactive = false, onClick = null) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const filled = i <= value;
            stars.push(
                <Star
                    key={i}
                    className={`${size} cursor-pointer transition-colors ${
                        filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                    }`}
                    onClick={interactive && onClick ? () => onClick(i) : undefined}
                />
            );
        }
        return <div className="flex gap-0.5">{stars}</div>;
    };

    return (
        <Card className="border-2 border-black mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reviews
                    {stats.rating && (
                        <span className="flex items-center gap-1 text-sm font-normal text-gray-600">
                            {renderStars(Math.round(stats.rating), 'w-4 h-4')}
                            <span>{stats.rating.toFixed(1)}</span>
                            <span className="text-gray-400">({stats.reviewCount})</span>
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Write/Edit Review */}
                {user ? (
                    <div className="border-2 border-black p-4">
                        {reviewLoading ? (
                            <p className="text-center text-gray-500">Loading your review...</p>
                        ) : userReview && !editing ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{user.name}</span>
                                        {renderStars(userReview.rating, 'w-4 h-4')}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleEdit}>
                                            <Edit className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </div>
                                {userReview.comment && <p className="text-gray-700">{userReview.comment}</p>}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Your Rating</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="p-1"
                                            >
                                                <Star
                                                    className={`w-8 h-8 cursor-pointer ${
                                                        star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Comment (optional)</label>
                                    <Textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your thoughts..."
                                        rows={3}
                                        className="border-2 border-black"
                                    />
                                </div>
                                <Button type="submit" disabled={submitting || !rating} className="w-full border-2 border-black bg-black text-white hover:bg-gray-800">
                                    {submitting ? 'Submitting...' : (editing ? 'Update Review' : 'Submit Review')}
                                </Button>
                                {editing && (
                                    <Button type="button" variant="outline" onClick={() => { setEditing(false); setRating(0); setComment(''); }} className="w-full">
                                        Cancel
                                    </Button>
                                )}
                            </form>
                        )}
                    </div>
                ) : (
                    <p className="text-center text-gray-600 py-4">
                        <a href="/login" className="text-blue-600 underline">Login</a> to write a review
                    </p>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                    {reviews.length === 0 && !loading ? (
                        <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
                    ) : (
                        <>
                            {reviews.map(review => (
                                <div key={review._id} className="border-b border-gray-200 pb-4 last:border-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{review.user?.name || 'Unknown'}</span>
                                            {renderStars(review.rating, 'w-4 h-4')}
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {review.comment && (
                                        <p className="mt-2 text-gray-700">{review.comment}</p>
                                    )}
                                </div>
                            ))}
                            {hasMore && (
                                <div className="text-center mt-4">
                                    <Button variant="outline" onClick={loadMore} disabled={loading} className="w-full border-2 border-black">
                                        {loading ? 'Loading...' : 'Load More'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}