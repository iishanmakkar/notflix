const { supabase } = require("./supabaseClient");
const bcrypt = require("bcryptjs");

const normalizeUser = (user) => user && ({ ...user, _id: user.id });

/** USER HELPERS */
const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error && error.code !== "PGRST116") throw error; // ignore "no rows" error
  return normalizeUser(data);
};

const findUserById = async (id) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return normalizeUser(data);
};

const createUser = async ({ name, email, password }) => {
  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  const { data, error } = await supabase
    .from("users")
    .insert({ name, email, password: hashed })
    .select()
    .single();
  if (error) throw error;
  return normalizeUser(data);
};

/** NOTE HELPERS */
const getNotesByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
};

const createNote = async ({ user_id, title, content }) => {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id, title, content })
    .single();
  if (error) throw error;
  return data;
};

/** ADDITIONAL HELPERS */

// NOTE HELPERS EXTENSION
const getNoteById = async (id) => {
  const { data, error } = await supabase.from('notes').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const getAllNotes = async (filter = {}) => {
  let query = supabase.from('notes').select('*');
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.subject) query = query.eq('subject', filter.subject.toLowerCase());
  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
};

const updateNote = async (id, updateData) => {
  const { data, error } = await supabase.from('notes').update(updateData).eq('id', id).single();
  if (error) throw error;
  return data;
};

const deleteNote = async (id) => {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
  return true;
};

const getPendingNotes = async () => {
  const { data, error } = await supabase.from('notes').select('*').eq('status', 'pending');
  if (error) throw error;
  return data;
};

const reviewNote = async (noteId, { status, reviewComment, reviewerId }) => {
  const update = {
    status,
    review_comment: reviewComment,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId
  };
  const { data, error } = await supabase.from('notes').update(update).eq('id', noteId).single();
  if (error) throw error;
  return data;
};

const incrementViews = async (id) => {
  const { data, error } = await supabase.from('notes').update({ views: supabase.rpc('increment', { current: 'views' }) }).eq('id', id).single();
  if (error) throw error;
  return data;
};

// NOTIFICATION HELPERS
const getUserNotifications = async (userId) => {
  const { data, error } = await supabase.from('notifications').select('*').eq('recipient', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
};

const markNotificationRead = async (notifId, userId) => {
  const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId).eq('recipient', userId).single();
  if (error) throw error;
  return data;
};

const clearAllUserNotifications = async (userId) => {
  const { error } = await supabase.from('notifications').delete().eq('recipient', userId);
  if (error) throw error;
  return true;
};

// USER HELPERS EXTENSION
const updateUser = async (id, updateData) => {
  const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) throw error;
  return normalizeUser(data);
};

// REVIEW HELPERS (if separate table)
const createReview = async (review) => {
  const { data, error } = await supabase.from('reviews').insert(review).single();
  if (error) throw error;
  return data;
};

// PAYMENT HELPERS
const createNotification = async ({ recipient, actor = null, type, title, message, link = '/' }) => {
  const { data, error } = await supabase.from('notifications').insert({
    recipient,
    actor,
    type,
    title,
    message,
    link
  }).single();
  if (error) throw error;
  return data;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  getNotesByUserId,
  createNote,
  getNoteById,
  getAllNotes,
  updateNote,
  deleteNote,
  getPendingNotes,
  reviewNote,
  incrementViews,
  getUserNotifications,
  markNotificationRead,
  clearAllUserNotifications,
  updateUser,
  createReview,
  createNotification,
};
