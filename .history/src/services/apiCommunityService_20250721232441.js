// Get a single active post by postId, including reactions with emoji unicode
export const getActivePostByIdForUser = async (postId) => {
  try {
    const response = await apiClient.get(`CommunityPost/active/${postId}`);
    if (response.data.statusCode === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch post');
    }
  } catch (error) {
    throw error;
  }
};
// Hide (set status) a comment by commentId (e.g., status = 'inactive' or 'hidden')
export const updateCommentStatus = async (commentId,status) => {
  try {
    const response = await apiClient.put(`PostComment/${commentId}/status`,{ status });
    if (response.data.statusCode === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update comment status');
    }
  } catch (error) {
    throw error;
  }
};
// Hide (set status) a post by postId (e.g., status = 'inactive' or 'hidden')
export const updatePostStatus = async (postId,status) => {
  try {
    const response = await apiClient.put(`CommunityPost/${postId}/status`,{ status });
    if (response.data.statusCode === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update post status');
    }
  } catch (error) {
    throw error;
  }
};
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const response = await apiClient.post('/Auth/refresh-token',{ refreshToken });
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken: newAccessToken,refreshToken: newRefreshToken } = response.data.data;
          await AsyncStorage.setItem('accessToken',newAccessToken);
          await AsyncStorage.setItem('refreshToken',newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
        throw new Error('Failed to refresh token');
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
        throw new Error('Unauthorized access, please log in again.');
      }
    }

    if (error.response?.status === 400 && error.response?.data?.errors) {
      const errorMessages = Object.values(error.response.data.errors).flat().join(', ');
      throw new Error(errorMessages || 'Invalid request data.');
    }

    throw new Error(error.response?.data?.message || error.message);
  }
);

export const getAllActiveGroups = async (params = {}) => {
  try {
    const response = await apiClient.get('CommunityGroup/all-active-group',{ params });
    if (response.data.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch groups');
    }
  } catch (error) {
    throw error;
  }
};

export const getMyGroupCreated = async (id,params = {}) => {
  try {
    const response = await apiClient.get(`CommunityGroup/creator/me`,{ params });
    if (response.data.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch my group');
    }
  } catch (error) {
    throw error;
  }
};

export const getMyGroupFilter = async (searchTerm) => {
  try {
    const response = await apiClient.get(`CommunityGroup/my-groups/filter`,{ searchTerm });
    if (response.data.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch my group');
    }
  } catch (error) {
    throw error;
  }
};

export const getMyGroupJoined = async (excludeId,params = {}) => {
  try {
    const response = await apiClient.get(`CommunityGroup/my-joined-groups/${excludeId}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch my joined group');
    }
  } catch (error) {
    throw error;
  }
};

export const getGroupActiveById = async (id) => {
  try {
    const response = await apiClient.get(`CommunityGroup/active/${id}`);
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch group details');
    }
  } catch (error) {
    throw error;
  }
};

export const joinGroup = async (groupId,isPrivate = false) => {
  try {
    const response = await apiClient.post('GroupMember/join',{
      groupId,
      isRequested: isPrivate ? true : false
    });
    if (response.data.statusCode === 201) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to join group');
    }
  } catch (error) {
    throw error;
  }
};

export const leaveGroup = async (groupId) => {
  try {
    const response = await apiClient.post('GroupMember/leave',{ groupId });
    if (response.data.statusCode === 200) {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Failed to leave group');
    }
  } catch (error) {
    throw error;
  }
};

export const getGroupPosts = async (groupId,params = {}) => {
  try {
    const response = await apiClient.get(`CommunityPost/group/${groupId}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.posts;
    } else {
      throw new Error(response.data.message || 'Failed to fetch posts');
    }
  } catch (error) {
    throw error;
  }
};

export const getAllReactionTypes = async (params = {}) => {
  try {
    const response = await apiClient.get('ReactionType',{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.reactionTypes;
    } else {
      throw new Error(response.data.message || 'Failed to fetch reaction types');
    }
  } catch (error) {
    throw error;
  }
};

export const getCommentsByPostId = async (postId,params = {}) => {
  try {
    const response = await apiClient.get(`PostComment/active/by-post/${postId}`,{ params });
    if (response.data.statusCode === 200) {
      return (response.data.data.comments || []).map(c => ({
        ...c,
        userFullName: c.userFullName || null,
        userAvatar: c.userAvatar || null,
      }))
    } else {
      throw new Error(response.data.message || 'Failed to fetch comments');
    }
  } catch (error) {
    throw error;
  }
};

export const addCommentByUser = async (postId,commentText) => {
  try {
    const response = await apiClient.post('PostComment/user',{ postId,commentText });
    if (response.data.statusCode === 201) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to add comment');
    }
  } catch (error) {
    throw error;
  }
};

export const editCommentByUser = async (commentId,postId,commentText) => {
  try {
    const response = await apiClient.put(`PostComment/user/${commentId}`,{ postId,commentText });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to edit comment');
    }
  } catch (error) {
    throw error;
  }
};

export const deleteUserComment = async (commentId) => {
  try {
    const response = await apiClient.delete(`PostComment/delete/user/${commentId}`);
    if (response.data.statusCode === 200) {
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to delete comment');
    }
  } catch (error) {
    throw error;
  }
};

export const createPost = async (postDto) => {
  try {
    const response = await apiClient.post('CommunityPost',postDto);
    if (response.data.statusCode === 201) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to create post');
    }
  } catch (error) {
    throw error;
  }
};

export const updatePost = async (postId,postDto) => {
  try {
    const response = await apiClient.put(`CommunityPost/${postId}`,postDto);
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update post');
    }
  } catch (error) {
    if (error.response) {
      const { statusCode,message,errors } = error.response.data;
      if (statusCode === 400 && errors) {
        throw new Error(JSON.stringify(errors));
      }
      throw new Error(message || 'Failed to update post');
    } else if (error.request) {
      throw new Error('No response from server. Please check your network connection.');
    } else {
      throw new Error(error.message || 'An unexpected error occurred while updating the post');
    }
  }
};

export const deletePost = async (postId) => {
  try {
    const response = await apiClient.delete(`CommunityPost/${postId}`);
    if (response.data.statusCode === 200) {
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to delete post');
    }
  } catch (error) {
    throw error;
  }
};

export const getAllTags = async (params = {}) => {
  try {
    const response = await apiClient.get('Tag/active',{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.tags;
    } else {
      throw new Error(response.data.message || 'Failed to fetch tags');
    }
  } catch (error) {
    throw error;
  }
};

export const reactToPost = async (postId,reactionTypeId,reactionText = null) => {
  try {
    const response = await apiClient.post('PostReaction/react',{
      postId,
      reactionTypeId,
      reactionText,
    });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to react to post');
    }
  } catch (error) {
    throw error;
  }
};

export const unreactToPost = async (postId) => {
  try {
    const response = await apiClient.delete(`PostReaction/unreact/${postId}`);
    if (response.data.statusCode === 200) {
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to unreact to post');
    }
  } catch (error) {
    throw error;
  }
};

export const getAllActiveReportReasons = async (params = {}) => {
  try {
    const response = await apiClient.get('ReportReason/active',{ params });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch report reasons');
    }
  } catch (error) {
    throw error;
  }
};

export const checkUserReport = async (postId) => {
  try {
    if (!postId || postId <= 0) {
      throw new Error("PostId must be a positive integer.");
    }
    const response = await apiClient.get(`/PostReport/check/${postId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to check report status." };
  }
}

export const createReportByUser = async (reportDto) => {
  try {
    console.log('[REPORT] Payload gửi lên API:',JSON.stringify(reportDto,null,2));
    const response = await apiClient.post('PostReport/user',reportDto);
    if (response.data.statusCode === 201 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to create report');
    }
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message ||
        (error.response.data?.errors ? JSON.stringify(error.response.data.errors) : 'Failed to create report')
      );
    } else {
      console.log('Report API error:',error.message);
      throw new Error(error.message || 'Failed to create report');
    }
  }
};

export const getPostsByOwner = async (ownerId,params = {}) => {
  try {
    const response = await apiClient.get(`CommunityPost/owner/${ownerId}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.posts || [];
    } else {
      throw new Error(response.data.message || 'Failed to fetch posts by owner');
    }
  } catch (error) {
    throw error;
  }
};

export const getReactionsByPostId = async (postId,params = {}) => {
  try {
    const response = await apiClient.get(`PostReaction/by-post/${postId}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.Reactions || [];
    } else {
      throw new Error(response.data.message || 'Failed to fetch reactions');
    }
  } catch (error) {
    throw error;
  }
};

export const getMyReports = async (params = {}) => {
  try {
    const response = await apiClient.get('PostReport/my-reports',{ params });
    if (response.data.statusCode === 200) {
      return response.data.data.reports || [];
    } else {
      throw new Error(response.data.message || 'Failed to fetch reports');
    }
  } catch (error) {
    throw error;
  }
};

export const getMyGroupActiveById = async (id) => {
  try {
    const response = await apiClient.get(`CommunityGroup/mygroup/${id}`);
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch group details');
    }
  } catch (error) {
    throw error;
  }
};

export const createGroup = async (groupDto) => {
  try {
    const response = await apiClient.post('CommunityGroup',groupDto);
    if (response.data.statusCode === 201 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to create group');
    }
  } catch (error) {
    throw error;
  }
};

export const updateMyGroup = async (id,groupDto) => {
  try {
    const response = await apiClient.put(`CommunityGroup/me/${id}`,groupDto);
    if (response.data.statusCode === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update group');
    }
  } catch (error) {
    throw error;
  }
};

export const deleteGroup = async (id) => {
  try {
    const response = await apiClient.delete(`CommunityGroup/${id}`);
    if (response.data.statusCode === 200) {
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to delete group');
    }
  } catch (error) {
    throw error;
  }
};

export const getGroupsByCreator = async (params = {}) => {
  try {
    const response = await apiClient.get('CommunityGroup/creator/me',{ params });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch groups by creator');
    }
  } catch (error) {
    throw error;
  }
};

export const getGroupJoinRequests = async (groupId,status = 'pending',params = {}) => {
  try {
    const response = await apiClient.get(`GroupMember/join-requests/${groupId}/${status}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch join requests');
    }
  } catch (error) {
    throw error;
  }
};

export const updateMemberStatus = async (id,status) => {
  try {
    const response = await apiClient.put(`/groupMember/${id}/status`,{ status });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addOrUpdateGroupMember = async (memberDto) => {
  try {
    const response = await apiClient.post('GroupMember/add-or-update',memberDto);
    if (response.data.statusCode === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to add or update group member');
    }
  } catch (error) {
    throw error;
  }
};

export const getGroupActiveMembers = async (groupId,params = {}) => {
  try {
    const response = await apiClient.get(`GroupMember/join-requests-active/${groupId}`,{ params });
    if (response.data.statusCode === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch active group members');
    }
  } catch (error) {
    throw error;
  }
};

