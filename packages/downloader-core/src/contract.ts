import { oc } from '@orpc/contract'
import {
  AuthLoginInputSchema,
  AuthLoginOutputSchema,
  CancelDownloadInputSchema,
  CancelDownloadOutputSchema,
  ChangePasswordInputSchema,
  ChangePasswordOutputSchema,
  CreateUserInputSchema,
  CreateUserOutputSchema,
  DirectoryListInputSchema,
  CreateDownloadInputSchema,
  CreateDownloadOutputSchema,
  FileExistsOutputSchema,
  FileOperationOutputSchema,
  FilePathInputSchema,
  ListDirectoriesOutputSchema,
  ListDownloadsOutputSchema,
  ListHistoryOutputSchema,
  ListUsersOutputSchema,
  PlaylistDownloadInputSchema,
  PlaylistDownloadOutputSchema,
  PlaylistInfoInputSchema,
  PlaylistInfoOutputSchema,
  RemoveHistoryByPlaylistInputSchema,
  RemoveHistoryItemsInputSchema,
  RemoveHistoryOutputSchema,
  RemoveUserInputSchema,
  RemoveUserOutputSchema,
  SetWebSettingsInputSchema,
  StatusOutputSchema,
  GetWebSettingsOutputSchema,
  UploadSettingsFileInputSchema,
  UploadSettingsFileOutputSchema,
  VideoInfoInputSchema,
  VideoInfoOutputSchema
} from './schemas'

export const downloaderContract = {
  status: oc.output(StatusOutputSchema),
  videoInfo: oc.input(VideoInfoInputSchema).output(VideoInfoOutputSchema),
  playlist: {
    info: oc.input(PlaylistInfoInputSchema).output(PlaylistInfoOutputSchema),
    download: oc.input(PlaylistDownloadInputSchema).output(PlaylistDownloadOutputSchema)
  },
  downloads: {
    create: oc.input(CreateDownloadInputSchema).output(CreateDownloadOutputSchema),
    list: oc.output(ListDownloadsOutputSchema),
    cancel: oc.input(CancelDownloadInputSchema).output(CancelDownloadOutputSchema)
  },
  history: {
    list: oc.output(ListHistoryOutputSchema),
    removeItems: oc.input(RemoveHistoryItemsInputSchema).output(RemoveHistoryOutputSchema),
    removeByPlaylist: oc
      .input(RemoveHistoryByPlaylistInputSchema)
      .output(RemoveHistoryOutputSchema)
  },
  files: {
    exists: oc.input(FilePathInputSchema).output(FileExistsOutputSchema),
    listDirectories: oc
      .input(DirectoryListInputSchema)
      .output(ListDirectoriesOutputSchema),
    openFile: oc.input(FilePathInputSchema).output(FileOperationOutputSchema),
    openFileLocation: oc.input(FilePathInputSchema).output(FileOperationOutputSchema),
    copyFileToClipboard: oc
      .input(FilePathInputSchema)
      .output(FileOperationOutputSchema),
    deleteFile: oc.input(FilePathInputSchema).output(FileOperationOutputSchema),
    uploadSettingsFile: oc
      .input(UploadSettingsFileInputSchema)
      .output(UploadSettingsFileOutputSchema)
  },
  settings: {
    get: oc.output(GetWebSettingsOutputSchema),
    set: oc.input(SetWebSettingsInputSchema).output(GetWebSettingsOutputSchema)
  },
  auth: {
    login: oc.input(AuthLoginInputSchema).output(AuthLoginOutputSchema)
  },
  users: {
    list: oc.output(ListUsersOutputSchema),
    create: oc.input(CreateUserInputSchema).output(CreateUserOutputSchema),
    remove: oc.input(RemoveUserInputSchema).output(RemoveUserOutputSchema),
    changePassword: oc.input(ChangePasswordInputSchema).output(ChangePasswordOutputSchema)
  }
}
