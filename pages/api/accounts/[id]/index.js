import { badRequest, hashPassword, methodNotAllowed, ok, unauthorized } from 'next-basics';
import { getAccount, deleteAccount, updateAccount } from 'queries';
import { useAuth } from 'lib/middleware';

export default async (req, res) => {
  await useAuth(req, res);

  const { isAdmin, userId } = req.auth;
  const { id } = req.query;

  if (req.method === 'GET') {
    if (id !== userId && !isAdmin) {
      return unauthorized(res);
    }

    const account = await getAccount({ id: +id });

    return ok(res, account);
  }

  if (req.method === 'POST') {
    const { username, password, isViewer, websiteIds } = req.body;

    if (id !== userId && !isAdmin) {
      return unauthorized(res);
    }

    const account = await getAccount({ id: +id });

    const data = {};

    data.isViewer = isViewer;

    if (password) {
      data.password = hashPassword(password);
    }

    // Only admin can change these fields
    if (isAdmin) {
      data.username = username;

      const existingWebsiteIds = websiteIds.map(id => parseInt(id));

      const websitesToDisconnect = account.viewwebsites
        .map(vw => vw.websiteId)
        .filter(id => !existingWebsiteIds.includes(id));

      const websitesToConnect = existingWebsiteIds.filter(
        id => !account.viewwebsites.map(vw => vw.websiteId).includes(id),
      );

      data.viewwebsites = {
        create: websitesToConnect.map(id => ({ website: { connect: { id } } })),
        deleteMany: websitesToDisconnect.map(id => ({
          websiteId: id,
          userId: account.id,
        })),
      };
    }

    // Check when username changes
    if (data.username && account.username !== data.username) {
      const accountByUsername = await getAccount({ username });

      if (accountByUsername) {
        return badRequest(res, 'Account already exists.');
      }
    }

    const updated = await updateAccount(data, { id: +id });

    return ok(res, updated);
  }

  if (req.method === 'DELETE') {
    if (id === userId) {
      return badRequest(res, 'You cannot delete your own account.');
    }

    if (!isAdmin) {
      return unauthorized(res);
    }

    await deleteAccount(+id);

    return ok(res);
  }

  return methodNotAllowed(res);
};
