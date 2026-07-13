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
    text: row.body,
    date: formatDate(row.created_at),
    created: new Date(row.created_at).getTime(),
    incoming: row.recipient_id === userId,
  }));
}

export async function createMessage(recipientId, recipientName, text, user) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      sender_name: user.username,
      recipient_name: recipientName,
      body: text.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    senderId: user.id,
    recipientId,
    partnerId: recipientId,
    partnerName: recipientName,
    to: recipientName,
    from: user.username,
    text: data.body,
    date: formatDate(data.created_at),
    created: new Date(data.created_at).getTime(),
    incoming: false,
  };
}
