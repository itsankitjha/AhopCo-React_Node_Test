const MeetingHistory = require("../../model/schema/meeting");
const User = require("../../model/schema/user");
const { Lead } = require("../../model/schema/lead");
const { Contact } = require("../../model/schema/contact");

const add = async (req, res) => {
  try {
    const {
      agenda,
      attendes,
      attendesLead,
      location,
      related,
      dateTime,
      notes,
    } = req.body;

    let userName = "";
    if (req.user.userId) {
      const user = await User.findById(req.user.userId);
      userName = user.firstName + " " + user.lastName;
    }

    const meeting = new MeetingHistory({
      agenda,
      attendes,
      attendesLead,
      location,
      related,
      dateTime,
      notes,
      createBy: req.user.userId,
      createdByName: userName,
    });

    const savedMeeting = await meeting.save();

    const populatedMeeting = await MeetingHistory.findById(savedMeeting._id);

    res.status(201).json({
      data: populatedMeeting,
      message: "Meeting created successfully",
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getAttendeesDetails = async (meeting) => {
  const attendes = [];
  const attendesLead = [];

  for (const id of meeting.attendes || []) {
    const contactId = id.toString();

    const contact = await Contact.findById(contactId);

    if (contact) {
      attendes.push(contact);
    }
  }

  for (const id of meeting.attendesLead || []) {
    const leadId = id.toString();
    const lead = await Lead.findById(leadId);
    if (lead) {
      attendesLead.push(lead);
    }
  }

  return {
    attendes,
    attendesLead,
  };
};

const index = async (req, res) => {
  try {
    const query = { ...req.query, deleted: false };
    const meetings = await MeetingHistory.find(query).exec();

    const meetingsWithDetails = await Promise.all(
      meetings.map(async (meeting) => {
        const { attendes, attendesLead } = await getAttendeesDetails(meeting);
        return {
          ...meeting.toObject(),
          attendes,
          attendesLead,
        };
      })
    );

    res.status(200).json(meetingsWithDetails);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const view = async (req, res) => {
  try {
    const meeting = await MeetingHistory.findOne({ _id: req.params.id });
    if (!meeting) return res.status(404).json({ message: "No meeting found." });

    const { attendes, attendesLead } = await getAttendeesDetails(meeting);

    const meetingWithDetails = {
      ...meeting.toObject(),
      attendes,
      attendesLead,
    };

    res.status(200).json(meetingWithDetails);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const deleteData = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const meeting = await MeetingHistory.findById(meetingId);

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    await MeetingHistory.updateOne(
      { _id: meetingId },
      { $set: { deleted: true } }
    );

    res.status(200).json({ message: "Meeting deleted successfully" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const deleteMany = async (req, res) => {
  try {
    const meetingIds = req.body;

    const updatedMeetings = await MeetingHistory.updateMany(
      { _id: { $in: meetingIds } },
      { $set: { deleted: true } }
    );

    res
      .status(200)
      .json({ message: "Meetings deleted successfully", updatedMeetings });
  } catch (error) {
    res.status(500).json({ message: "error", error });
  }
};

module.exports = { add, index, view, deleteData, deleteMany };
