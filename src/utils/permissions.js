const { PermissionsBitField } = require('discord.js');
const { hasAnyRole } = require('./helpers');

function isDeveloper(userId, config) {
  return (config.developers?.ids || []).includes(userId);
}

function isOwnerAdmin(member, config) {
  return hasAnyRole(member, config.adminStatus?.ownerRoleIds || []);
}

function isSupportStaff(member, config) {
  const trackedRoleIds = [
    ...(config.supportRoleIds || []),
    ...(config.allowedClaimRoleIds || [])
  ];

  return hasAnyRole(member, trackedRoleIds);
}

function hasAdminPermission(member) {
  return member?.permissions?.has?.(PermissionsBitField.Flags.Administrator) || false;
}

function canManageBot(member, userId, config) {
  return isDeveloper(userId, config) || hasAdminPermission(member) || isOwnerAdmin(member, config);
}

function canHandleTickets(member, userId, config) {
  return isDeveloper(userId, config) || isSupportStaff(member, config);
}

module.exports = {
  isDeveloper,
  isOwnerAdmin,
  isSupportStaff,
  hasAdminPermission,
  canManageBot,
  canHandleTickets
};
