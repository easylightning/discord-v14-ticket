const { readStore, writeStore } = require('./storage');

function getTickets() {
  return readStore('tickets');
}

function getTicket(threadId) {
  return getTickets()[threadId] || null;
}

function saveTicket(threadId, data) {
  const tickets = getTickets();
  tickets[threadId] = { ...(tickets[threadId] || {}), ...data };
  writeStore('tickets', tickets);
  return tickets[threadId];
}

function appendTicketHistory(threadId, entry, limit = 100) {
  const tickets = getTickets();
  const ticket = tickets[threadId];
  if (!ticket) return null;
  if (!Array.isArray(ticket.history)) ticket.history = [];
  ticket.history.unshift({
    at: Date.now(),
    ...entry
  });
  if (ticket.history.length > limit) ticket.history.length = limit;
  writeStore('tickets', tickets);
  return ticket;
}

function deleteTicket(threadId) {
  const tickets = getTickets();
  delete tickets[threadId];
  writeStore('tickets', tickets);
}

function getOpenTicketsForUser(userId) {
  return Object.values(getTickets()).filter((ticket) => ticket.ownerId === userId && !ticket.closed);
}

function getOpenTicketForUserCategory(userId, category) {
  return Object.values(getTickets()).find((ticket) => ticket.ownerId === userId && ticket.category === category && !ticket.closed) || null;
}

function getNextTicketNumber() {
  const sequence = readStore('sequence');
  const currentMax = Object.values(getTickets()).reduce((max, ticket) => {
    const value = Number(ticket.ticketNumber || 0);
    return value > max ? value : max;
  }, 0);
  const base = Math.max(Number(sequence.ticketCounter || 0), currentMax);
  const next = base + 1;
  sequence.ticketCounter = next;
  writeStore('sequence', sequence);
  return String(next).padStart(4, '0');
}

module.exports = { getTickets, getTicket, saveTicket, appendTicketHistory, deleteTicket, getOpenTicketsForUser, getOpenTicketForUserCategory, getNextTicketNumber };
