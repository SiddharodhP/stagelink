import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { InquiryStatus } from "@/types/database";

const supabase = createBrowserClient();

export async function sendInquiry(data: { organizer_id: string; musician_id: string; message: string; proposed_budget: number; event_date: string }) {
  // To avoid schema issues if event_date isn't present in DB, embed it in the message
  const modifiedData = {
    organizer_id: data.organizer_id,
    musician_id: data.musician_id,
    proposed_budget: data.proposed_budget,
    message: `[Event Date: ${data.event_date}]\n\n${data.message}`
  };

  const { data: response, error } = await supabase
    .from("inquiries")
    .insert(modifiedData)
    .select()
    .single();

  return { data: response, error };
}

// Helper function to extract event date and auto-complete past accepted inquiries
const processInquiries = async (inquiries: any[]) => {
  if (!inquiries) return inquiries;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // reset time to start of day

  const updatedInquiries = await Promise.all(inquiries.map(async (inquiry) => {
    // Parse event date from message if it exists
    const match = inquiry.message.match(/\[Event Date: (.*?)\]/);
    if (match) {
      inquiry.event_date = match[1];
      // Optional: hide the tag from the UI by cleaning the message
      inquiry.message = inquiry.message.replace(`[Event Date: ${match[1]}]\n\n`, '');
    }

    if (inquiry.status === 'accepted' && inquiry.event_date) {
      const eventDate = new Date(inquiry.event_date);
      if (eventDate < today) {
        // Update in DB
        await supabase
          .from("inquiries")
          .update({ status: 'completed' })
          .eq("id", inquiry.id);
        
        return { ...inquiry, status: 'completed' };
      }
    }
    return inquiry;
  }));
  
  return updatedInquiries;
};

export async function getMusicianInquiries(musicianId: string) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      *,
      organizer:organizer_id(*)
    `)
    .eq("musician_id", musicianId)
    .order("created_at", { ascending: false });

  if (data) {
    const updatedData = await processInquiries(data);
    return { data: updatedData, error };
  }

  return { data, error };
}

export async function getOrganizerInquiries(organizerId: string) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      *,
      musician:musician_id(stage_name, profile_image)
    `)
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (data) {
    const updatedData = await processInquiries(data);
    return { data: updatedData, error };
  }

  return { data, error };
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  // First update the status
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  // If accepted, add to availability
  if (data && status === 'accepted') {
    // Parse date since we removed it from column
    const match = data.message.match(/\[Event Date: (.*?)\]/);
    const eventDate = match ? match[1] : null;

    if (eventDate) {
      // Check if availability already exists
      const { data: existingAvailability } = await supabase
        .from("availability")
        .select("*")
        .eq("musician_id", data.musician_id)
        .eq("available_date", eventDate)
        .single();

      if (existingAvailability) {
        // Update existing availability to booked
        await supabase
          .from("availability")
          .update({ is_booked: true })
          .eq("id", existingAvailability.id);
      } else {
        // Insert new availability record
        await supabase
          .from("availability")
          .insert({
            musician_id: data.musician_id,
            available_date: eventDate,
            is_booked: true
          });
      }
    }
  }

  return { data, error };
}
