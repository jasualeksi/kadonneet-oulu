import { supabase } from "./supabase";

const formatDate = (value) => new Date(value).toLocaleDateString("fi-FI");

function mapComment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    user: row.user_name,
    text: row.body || "",
    image: row.image_url || "",
    created: new Date(row.created_at).getTime(),
    updated: new Date(row.updated_at || row.created_at).getTime(),
    edited: Boolean(row.updated_at && new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000),
  };
}

export function mapNotice(row) {
  return {
    id: row.id,
    type: row.type === "Menopeli" ? "Ajoneuvo" : row.type,
    name: row.title,
    area: row.area,
    desc: row.description,
    phone: row.phone || "",
    contactEmail: row.contact_email,
    reward: row.reward || "",
    preview: row.image_url || "",
    date: formatDate(row.created_at),
    created: new Date(row.created_at).getTime(),
    expiresAt: row.expires_at,
    user: row.user_name,
    owner: row.owner_id,
    found: row.status === "found",
    foundAt: row.found_at,
    comments: (row.comments || []).map(mapComment).sort((a, b) => a.created - b.created),
  };
}

async function uploadImage(file, userId, folder) {
  if (!file) return null;
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Kuvan enimmäiskoko on 10 Mt.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Kuvan pitää olla JPG-, PNG- tai WebP-tiedosto.");
  const extension = file.name?.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return {
    path,
    url: supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl,
  };
}

export async function fetchNotices() {
  const { data, error } = await supabase
    .from("notices")
    .select("*, comments(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNotice);
}

export async function createNotice(form, user) {
  const uploadedImage = await uploadImage(form.imageFile, user.id, "notices");
  const noticeValues = {
      owner_id: user.id,
      user_name: user.username,
      type: form.type,
      title: form.name.trim(),
      area: form.area,
      description: form.desc.trim(),
      phone: form.phone.trim() || null,
      contact_email: form.contactEmail.trim(),
      reward: form.reward ? Number(form.reward) : null,
      image_url: uploadedImage?.url || null,
    };
  let { data, error } = await supabase
    .from("notices")
    .insert(noticeValues)
    .select("*, comments(*)")
    .single();
  // Yhteensopivuus ennen kuin vanhan tietokannan tyyppirajoite on päivitetty.
  if (error && form.type === "Ajoneuvo") {
    ({ data, error } = await supabase
      .from("notices")
      .insert({ ...noticeValues, type: "Menopeli" })
      .select("*, comments(*)")
      .single());
  }
  if (error) {
    if (uploadedImage)
      await supabase.storage.from("uploads").remove([uploadedImage.path]);
    throw error;
  }
  return mapNotice(data);
}

export async function updateNotice(id, form, userId) {
  const uploadedImage = await uploadImage(form.imageFile, userId, "notices");
  const noticeValues = {
    type: form.type,
    title: form.name.trim(),
    area: form.area,
    description: form.desc.trim(),
    phone: form.phone.trim() || null,
    contact_email: form.contactEmail.trim(),
    reward: form.reward ? Number(form.reward) : null,
    ...(uploadedImage ? { image_url: uploadedImage.url } : {}),
  };
  let { data, error } = await supabase
    .from("notices")
    .update(noticeValues)
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*, comments(*)")
    .single();
  if (error && form.type === "Ajoneuvo") {
    ({ data, error } = await supabase
      .from("notices")
      .update({ ...noticeValues, type: "Menopeli" })
      .eq("id", id)
      .eq("owner_id", userId)
      .select("*, comments(*)")
      .single());
  }
  if (error) {
    if (uploadedImage)
      await supabase.storage.from("uploads").remove([uploadedImage.path]);
    throw error;
  }
  return mapNotice(data);
}

export async function removeNotice(id) {
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw error;
}

export async function setNoticeFound(id) {
  const { data, error } = await supabase
    .from("notices")
    .update({ status: "found", found_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, comments(*)")
    .single();
  if (error) throw error;
  return mapNotice(data);
}

export async function reactivateNotice(id) {
  const { data, error } = await supabase
    .from("notices")
    .update({ status: "open", found_at: null })
    .eq("id", id)
    .select("*, comments(*)")
    .single();
  if (error) throw error;
  return mapNotice(data);
}

export async function createComment(noticeId, text, file, user) {
  const uploadedImage = await uploadImage(file, user.id, "comments");
  const { data, error } = await supabase
    .from("comments")
    .insert({
      notice_id: noticeId,
      user_id: user.id,
      user_name: user.username,
      body: text.trim() || null,
      image_url: uploadedImage?.url || null,
    })
    .select()
    .single();
  if (error) {
    if (uploadedImage)
      await supabase.storage.from("uploads").remove([uploadedImage.path]);
    throw error;
  }
  return mapComment(data);
}

export async function updateComment(commentId, text, userId) {
  const { data, error } = await supabase
    .from("comments")
    .update({ body: text.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapComment(data);
}

export async function deleteComment(commentId, userId, imageUrl = "") {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;

  const marker = "/storage/v1/object/public/uploads/";
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex !== -1) {
    const path = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
    await supabase.storage.from("uploads").remove([path]);
  }
}

export async function fetchMessages(userId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    partnerId: row.sender_id === userId ? row.recipient_id : row.sender_id,
    partnerName: row.sender_id === userId ? row.recipient_name : row.sender_name,
    to: row.sender_id === userId ? row.recipient_name : row.sender_name,
    from: row.sender_name,
    text: row.body || "",
    image: row.image_url || "",
    date: formatDate(row.created_at),
    created: new Date(row.created_at).getTime(),
    incoming: row.recipient_id === userId,
  }));
}

export async function createMessage(recipientId, recipientName, text, user, file) {
  const uploadedImage = await uploadImage(file, user.id, "messages");
  const values = {
      sender_id: user.id,
      recipient_id: recipientId,
      sender_name: user.username,
      recipient_name: recipientName,
      body: text.trim() || null,
      ...(uploadedImage ? { image_url: uploadedImage.url } : {}),
    };
  const { data, error } = await supabase
    .from("messages")
    .insert(values)
    .select()
    .single();
  if (error) {
    if (uploadedImage)
      await supabase.storage.from("uploads").remove([uploadedImage.path]);
    throw error;
  }
  return {
    id: data.id,
    senderId: user.id,
    recipientId,
    partnerId: recipientId,
    partnerName: recipientName,
    to: recipientName,
    from: user.username,
    text: data.body || "",
    image: data.image_url || "",
    date: formatDate(data.created_at),
    created: new Date(data.created_at).getTime(),
    incoming: false,
  };
}

export async function fetchSavedNoticeIds(userId) {
  const { data, error } = await supabase
    .from("saved_notices")
    .select("notice_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((row) => row.notice_id);
}

export async function saveNotice(userId, noticeId) {
  const { error } = await supabase
    .from("saved_notices")
    .insert({ user_id: userId, notice_id: noticeId });
  if (error && error.code !== "23505") throw error;
}

export async function unsaveNotice(userId, noticeId) {
  const { error } = await supabase
    .from("saved_notices")
    .delete()
    .eq("user_id", userId)
    .eq("notice_id", noticeId);
  if (error) throw error;
}

export async function createReport(notice, reason, details, userId) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    notice_id: notice.id,
    reported_user_id: notice.owner,
    reported_user_name: notice.user,
    notice_title: notice.name,
    reason,
    details: details.trim(),
  });
  if (error) throw error;
}

export async function checkAdminRole(userId) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === "admin";
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setReportStatus(id, status) {
  const { error } = await supabase
    .from("reports")
    .update({ status, handled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
