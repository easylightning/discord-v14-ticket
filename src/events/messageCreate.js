const { getTicket, saveTicket, appendTicketHistory } = require('../utils/ticketStore');
const { canHandleTickets } = require('../utils/permissions');
const { recordStaffAction } = require('../utils/adminStats');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    const ticket = getTicket(message.channelId);
    if (!ticket || ticket.closed) return;
    if (!canHandleTickets(message.member, message.author.id, client.config)) return;

    if (client.config.adminStatus?.enabled !== false) {
      recordStaffAction(message.author.id, {
        tag: message.author.tag,
        displayName: message.member?.displayName || message.author.username
      }, 'ticket_message', message.channelId, {
        ownerId: ticket.ownerId,
        category: ticket.category
      });
    }

    appendTicketHistory(message.channelId, {
      action: 'staff_message',
      userId: message.author.id,
      tag: message.author.tag,
      details: 'Yetkili ticket kanalina mesaj atti.'
    });

    if (!ticket.firstStaffResponseAt) {
      const durationMs = Date.now() - Number(ticket.createdAt || Date.now());
      saveTicket(message.channelId, {
        firstStaffResponseAt: Date.now(),
        firstStaffResponseBy: message.author.id,
        firstStaffResponseByTag: message.author.tag
      });

      if (client.config.adminStatus?.enabled !== false) {
        recordStaffAction(message.author.id, {
          tag: message.author.tag,
          displayName: message.member?.displayName || message.author.username
        }, 'first_response', message.channelId, {
          ownerId: ticket.ownerId,
          category: ticket.category,
          durationMs
        });
      }
    }
  }
};
